const http = require('http')
const request = require('request')
const { Parser } = require('json2csv')
const fs = require('fs')

const server = http.createServer((req, res) => {
  const uri = 'http://15.164.75.18:3000/homework/2nd'
  request.get(uri, (err, response, body) => {
    console.log('body:', body)
    
    const data = JSON.parse(body).data
    console.log('data:', data.toString())

    const json2csvParser = new Parser({ fields: ['datetime'] })
    const csv = json2csvParser.parse([{
      'datetime': data,
    }])
    fs.writeFile('./data.csv', csv, (err) => {
      if (err) return

      fs.readFile('./data.csv', (err, data) => {
        if (err) return
        
        res.end(data.toString())
      })
    })
  })
})

server.listen(3000)
