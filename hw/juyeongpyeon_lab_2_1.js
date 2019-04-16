const url = require('url')
const http = require('http')
const querystring = require('querystring')
const crypto = require('crypto')

const server = http.createServer((req, res) => {
  const errResult = {
    msg: 'error',
    hashed: {}
  }
  res.writeHead(200, { 'Content-Type': 'application/json' })

  const query = querystring.parse(url.parse(req.url).query)
  if (!query.str) {
    res.end(JSON.stringify(errResult))
    return
  }
  console.log('query:', query)

  crypto.randomBytes(64, (err, buf) => {
    if (err) {
      res.end(JSON.stringify(errResult))
      return
    }

    const salt = buf.toString('base64')
    crypto.pbkdf2(query.str, salt, 100, 64, 'SHA512', (err, derivedKey) => {
      if (err) {
        res.end(JSON.stringify(errResult))
        return
      }

      const hashed = derivedKey.toString('base64')
      console.log('hashed str:', hashed)

      const result = {
        msg: 'success',
        hashed
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(result))
    })
  })
})

server.listen(3000)
