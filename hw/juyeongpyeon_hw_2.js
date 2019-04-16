const url = require('url')
const http = require('http')
const querystring = require('querystring')
const crypto = require('crypto')
const { Parser } = require('json2csv')
const fs = require('fs')

const server = http.createServer((req, res) => {
  switch (url.parse(req.url).pathname) {
    case '/signin': {
      const query = querystring.parse(url.parse(req.url).query)
      if (!query.id || !query.pw) {
        res.end('error: invalid input')
        return
      }
      console.log('query:', query)

      crypto.randomBytes(64, (err, buf) => {
        if (err) {
          res.end('error: randomBytes')
          return
        }
    
        const salt = buf.toString('base64')
        crypto.pbkdf2(query.pw, salt, 100, 64, 'SHA512', (err, derivedKey) => {
          if (err) {
            res.end('error: pbkdf2')
            return
          }
    
          const hashedPW = derivedKey.toString('base64')
          console.log('hashedPW:', hashedPW)

          const json2csvParser = new Parser({ fileds: [ 'id', 'hashedPW', 'salt' ] })
          const csvData = json2csvParser.parse([{
            id: query.id,
            pw: hashedPW,
            salt,
          }])
          fs.writeFile('./userData.csv', csvData, (err) => {
            if (err) return
            res.writeHead(200, { 'Content-Type':'text/plain; charset=utf-8' })
            res.end('회원가입 성공')
          })
        })
      })
      break
    }
    case '/signup': {
      break
    }
    case '/info': {
      break
    }
  }
})

server.listen(3000)