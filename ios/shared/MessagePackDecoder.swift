import Foundation

/// Errors that can occur during MessagePack decoding
public enum MessagePackError: Error {
    case unexpectedEndOfData
    case invalidFormat(UInt8)
    case invalidStringData
    case invalidMapKey
}

/// A lightweight MessagePack decoder that converts MessagePack binary data to JSONValue
/// This implementation supports all types needed by Voltra payloads:
/// - nil, bool, int, float/double, string, array (list), map (object)
public struct MessagePackDecoder {
    private var data: Data
    private var offset: Int
    
    public init(data: Data) {
        self.data = data
        self.offset = 0
    }
    
    /// Decode the MessagePack data into a JSONValue
    public mutating func decode() throws -> JSONValue {
        guard offset < data.count else {
            throw MessagePackError.unexpectedEndOfData
        }
        
        let format = data[offset]
        offset += 1
        
        // Positive fixint (0x00 - 0x7f)
        if format <= 0x7f {
            return .int(Int(format))
        }
        
        // Fixmap (0x80 - 0x8f)
        if format >= 0x80 && format <= 0x8f {
            let count = Int(format & 0x0f)
            return try decodeMap(count: count)
        }
        
        // Fixarray (0x90 - 0x9f)
        if format >= 0x90 && format <= 0x9f {
            let count = Int(format & 0x0f)
            return try decodeArray(count: count)
        }
        
        // Fixstr (0xa0 - 0xbf)
        if format >= 0xa0 && format <= 0xbf {
            let length = Int(format & 0x1f)
            return try decodeString(length: length)
        }
        
        // Negative fixint (0xe0 - 0xff)
        if format >= 0xe0 {
            return .int(Int(Int8(bitPattern: format)))
        }
        
        switch format {
        // nil
        case 0xc0:
            return .null
            
        // false
        case 0xc2:
            return .bool(false)
            
        // true
        case 0xc3:
            return .bool(true)
            
        // bin 8
        case 0xc4:
            let length = try readUInt8()
            return try decodeBinary(length: Int(length))
            
        // bin 16
        case 0xc5:
            let length = try readUInt16()
            return try decodeBinary(length: Int(length))
            
        // bin 32
        case 0xc6:
            let length = try readUInt32()
            return try decodeBinary(length: Int(length))
            
        // float 32
        case 0xca:
            let bits = try readUInt32()
            let float = Float(bitPattern: bits)
            return .double(Double(float))
            
        // float 64
        case 0xcb:
            let bits = try readUInt64()
            let double = Double(bitPattern: bits)
            return .double(double)
            
        // uint 8
        case 0xcc:
            let value = try readUInt8()
            return .int(Int(value))
            
        // uint 16
        case 0xcd:
            let value = try readUInt16()
            return .int(Int(value))
            
        // uint 32
        case 0xce:
            let value = try readUInt32()
            return .int(Int(value))
            
        // uint 64
        case 0xcf:
            let value = try readUInt64()
            return .int(Int(value))
            
        // int 8
        case 0xd0:
            let value = try readInt8()
            return .int(Int(value))
            
        // int 16
        case 0xd1:
            let value = try readInt16()
            return .int(Int(value))
            
        // int 32
        case 0xd2:
            let value = try readInt32()
            return .int(Int(value))
            
        // int 64
        case 0xd3:
            let value = try readInt64()
            return .int(Int(value))
            
        // str 8
        case 0xd9:
            let length = try readUInt8()
            return try decodeString(length: Int(length))
            
        // str 16
        case 0xda:
            let length = try readUInt16()
            return try decodeString(length: Int(length))
            
        // str 32
        case 0xdb:
            let length = try readUInt32()
            return try decodeString(length: Int(length))
            
        // array 16
        case 0xdc:
            let count = try readUInt16()
            return try decodeArray(count: Int(count))
            
        // array 32
        case 0xdd:
            let count = try readUInt32()
            return try decodeArray(count: Int(count))
            
        // map 16
        case 0xde:
            let count = try readUInt16()
            return try decodeMap(count: Int(count))
            
        // map 32
        case 0xdf:
            let count = try readUInt32()
            return try decodeMap(count: Int(count))
            
        default:
            throw MessagePackError.invalidFormat(format)
        }
    }
    
    // MARK: - Private helpers
    
    private mutating func readBytes(_ count: Int) throws -> Data {
        guard offset + count <= data.count else {
            throw MessagePackError.unexpectedEndOfData
        }
        let bytes = data.subdata(in: offset..<(offset + count))
        offset += count
        return bytes
    }
    
    private mutating func readUInt8() throws -> UInt8 {
        guard offset < data.count else {
            throw MessagePackError.unexpectedEndOfData
        }
        let value = data[offset]
        offset += 1
        return value
    }
    
    private mutating func readUInt16() throws -> UInt16 {
        let bytes = try readBytes(2)
        return UInt16(bytes[0]) << 8 | UInt16(bytes[1])
    }
    
    private mutating func readUInt32() throws -> UInt32 {
        let bytes = try readBytes(4)
        return UInt32(bytes[0]) << 24 | UInt32(bytes[1]) << 16 | UInt32(bytes[2]) << 8 | UInt32(bytes[3])
    }
    
    private mutating func readUInt64() throws -> UInt64 {
        let bytes = try readBytes(8)
        var value: UInt64 = 0
        for i in 0..<8 {
            value = value << 8 | UInt64(bytes[i])
        }
        return value
    }
    
    private mutating func readInt8() throws -> Int8 {
        return Int8(bitPattern: try readUInt8())
    }
    
    private mutating func readInt16() throws -> Int16 {
        return Int16(bitPattern: try readUInt16())
    }
    
    private mutating func readInt32() throws -> Int32 {
        return Int32(bitPattern: try readUInt32())
    }
    
    private mutating func readInt64() throws -> Int64 {
        return Int64(bitPattern: try readUInt64())
    }
    
    private mutating func decodeString(length: Int) throws -> JSONValue {
        let bytes = try readBytes(length)
        guard let string = String(data: bytes, encoding: .utf8) else {
            throw MessagePackError.invalidStringData
        }
        return .string(string)
    }
    
    private mutating func decodeBinary(length: Int) throws -> JSONValue {
        let bytes = try readBytes(length)
        // Encode binary as base64 string for compatibility with JSONValue
        return .string(bytes.base64EncodedString())
    }
    
    private mutating func decodeArray(count: Int) throws -> JSONValue {
        var elements: [JSONValue] = []
        elements.reserveCapacity(count)
        for _ in 0..<count {
            let element = try decode()
            elements.append(element)
        }
        return .array(elements)
    }
    
    private mutating func decodeMap(count: Int) throws -> JSONValue {
        var dict: [String: JSONValue] = [:]
        dict.reserveCapacity(count)
        for _ in 0..<count {
            let key = try decode()
            guard case .string(let keyString) = key else {
                throw MessagePackError.invalidMapKey
            }
            let value = try decode()
            dict[keyString] = value
        }
        return .object(dict)
    }
}

// MARK: - JSONValue extension for MessagePack parsing

extension JSONValue {
    /// Parse MessagePack binary data into JSONValue
    public static func parseMessagePack(from data: Data) throws -> JSONValue {
        var decoder = MessagePackDecoder(data: data)
        return try decoder.decode()
    }
}
