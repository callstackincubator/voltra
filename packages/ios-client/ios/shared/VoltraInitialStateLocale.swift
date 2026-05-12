import Foundation

/// Matches `@use-voltra/expo-plugin` `localePick` fallback order for bundled widget initial JSON.
public enum VoltraInitialStateLocale {
  public static func pickJson(from perLocale: [String: String], preferredLanguages: [String]) -> String? {
    let entries = perLocale.filter { !$0.value.isEmpty }
    if entries.isEmpty {
      return nil
    }

    func normalize(_ tag: String) -> String {
      tag.trimmingCharacters(in: .whitespacesAndNewlines)
        .lowercased()
        .replacingOccurrences(of: "_", with: "-")
    }

    var byNorm: [String: String] = [:]
    for (k, v) in entries {
      byNorm[normalize(k)] = v
    }

    for pref in preferredLanguages {
      let n = normalize(pref)
      if let direct = byNorm[n] {
        return direct
      }
      let lang = n.split(separator: "-").first.map(String.init) ?? n
      for (key, val) in entries {
        let kn = normalize(key)
        let keyLang = kn.split(separator: "-").first.map(String.init) ?? kn
        if keyLang == lang {
          return val
        }
      }
    }

    if let en = byNorm["en"] {
      return en
    }
    if let def = byNorm["__default"] {
      return def
    }

    let sorted = entries.keys.sorted()
    guard let firstKey = sorted.first else {
      return nil
    }
    return entries[firstKey]
  }

  public static func preferredLanguageTags() -> [String] {
    Locale.preferredLanguages
  }
}
