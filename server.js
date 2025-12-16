const http = require('http')

const server = http.createServer(async (req, res) => {
  // Log all incoming requests with timestamp, method, URL, and user agent
  const timestamp = new Date().toISOString()
  const userAgent = req.headers['user-agent'] || 'Unknown'
  const ip = req.socket.remoteAddress || req.connection.remoteAddress || 'Unknown'

  console.log(`[${timestamp}] ${req.method} ${req.url} - IP: ${ip} - User-Agent: ${userAgent}`)
  const body = await new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      resolve(body)
    })
  })
  console.log('Body:', body)

  // Set response headers
  res.writeHead(200, {
    'Content-Type': 'text/plain',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })

  // Handle different routes
  if (req.url === '/') {
    res.end('Welcome to Voltra HTTP Server!\n')
  } else if (req.url === '/health') {
    res.end('Server is healthy\n')
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('404 Not Found\n')
  }
})

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error)
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`🚀 Voltra HTTP Server running on port ${PORT}`)
  console.log(`📝 Request logging enabled`)
})
