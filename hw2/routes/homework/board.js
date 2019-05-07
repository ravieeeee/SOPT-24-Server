const express = require('express')
const router = express.Router()
const authUtil = require('../../utils/authUtil')
const statusCode = require('../../utils/statusCode')
const responseMessage = require('../../utils/responseMessage')
const crypto = require('crypto')
const fs = require('fs')
const { Parser } = require('json2csv')
const path = require('path')
const mkdirp = require('mkdirp')
const csvtojson = require('csvtojson')
const moment = require('moment')

const dataPath = '../../data/posts.csv'
const dataField = ['id', 'title', 'content', 'createdAt', 'hashedPassword', 'salt']

function isFileExist(filePath) {
  return fs.existsSync(path.join(__dirname, filePath))
}

router.get('/:id', async (req, res) => {
  const id = req.params.id
  if (!id) {
    res.status(200).send(
      authUtil.successFalse(
        statusCode.NO_CONTENT,
        responseMessage.OUT_OF_VALUE
      )
    )
    return
  }

  if (isFileExist(dataPath)) {
    try {
      const posts = await csvtojson().fromFile(path.join(__dirname, dataPath))

      for (let post of posts) {
        for (let prop in post) {
          if (prop === 'id' && post[prop] === id) {
            const formattedDate = moment(parseInt(post['createdAt'], 10)).format('LLLL')
            post['createdAt'] = formattedDate
            res.status(200).send(
              authUtil.successTrue(
                statusCode.OK,
                responseMessage.FETCHED_POST,
                post
              )
            )
            return
          }
        }
      }

      res.status(200).send(
        authUtil.successFalse(
          statusCode.NOT_FOUND,
          responseMessage.FETHCED_POST_FAIL
        )
      )
    } catch (err) {
      console.log(err)
      if (err.code !== 'ENOENT') {
        res.status(200).send(
          authUtil.successFalse(
            statusCode.INTERNAL_SERVER_ERROR,
            responseMessage.FILE_ERR
          )
        )
      }
    }
  } else {
    res.status(200).send(
      authUtil.successFalse(
        statusCode.NOT_FOUND,
        responseMessage.FETHCED_POST_FAIL
      )
    )
  }
})

router.post('/', async (req, res) => {
  const id = req.body.id
  const title = req.body.title
  const content = req.body.content
  const createdAt = new Date().getTime()
  const password = req.body.password
  if (!id || !title || !content || !password) {
    res.status(200).send(
      authUtil.successFalse(
        statusCode.NO_CONTENT,
        responseMessage.OUT_OF_VALUE
      )
    )
    return
  }

  if (isFileExist(dataPath)) {
    try {
      const posts = await csvtojson().fromFile(path.join(__dirname, dataPath))

      for (let post of posts) {
        for (let prop in post) {
          if (prop === 'title' && post[prop] === title) {
            res.status(200).send(
              authUtil.successFalse(
                statusCode.BAD_REQUEST,
                responseMessage.ALREADY_POST
              )
            )
            return
          }
        }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        res.status(200).send(
          authUtil.successFalse(
            statusCode.INTERNAL_SERVER_ERROR,
            responseMessage.FILE_ERR
          )
        )
        return
      }
    }
  }
  
  const buf = crypto.randomBytes(64)
  const salt = buf.toString('base64')
  const derivedKey = await crypto.pbkdf2Sync(password, salt, 100, 64, 'SHA512')
  const hashedPassword = derivedKey.toString('base64')

  const post = {
    id,
    title,
    content,
    createdAt,
    hashedPassword,
    salt
  }

  let json2csvParser, csvData
  if (!isFileExist(dataPath)) {
    mkdirp.sync(path.join(__dirname, '../../data'))
    json2csvParser = new Parser({ fields: dataField })
    csvData = json2csvParser.parse([ post ])
  } else {
    json2csvParser = new Parser({ header: false })
    csvData = json2csvParser.parse([ post ])
  }
  fs.appendFileSync(path.join(__dirname, dataPath), csvData + '\n')

  res.status(statusCode.OK).send(
    authUtil.successTrue(
      statusCode.CREATED,
      responseMessage.CREATED_POST,
      post
    )
  )
})

router.put('/', async (req, res) => {
  const id = req.body.id
  const title = req.body.title
  const content = req.body.content
  const password = req.body.password
  if (!id || !password) {
    res.status(200).send(
      authUtil.successFalse(
        statusCode.NO_CONTENT,
        responseMessage.OUT_OF_VALUE
      )
    )
    return
  }
  
  if (isFileExist(dataPath)) {
    try {
      const posts = await csvtojson().fromFile(path.join(__dirname, dataPath))

      const titles = []
      if (title) {
        for (let post of posts) {
          titles.push(post['title'])
        }
      }
      
      for (let post of posts) {
        for (let prop in post) {
          if (prop === 'id' && post[prop] === id) {
            const savedPassword = post['hashedPassword']
            const salt = post['salt']

            const derivedKey = await crypto.pbkdf2Sync(password, salt, 100, 64, 'SHA512')
            const hashedPassword = derivedKey.toString('base64')

            if (savedPassword === hashedPassword) {
              titles.splice(posts.indexOf(post), 1)
              // check title
              if (title && !!titles.length && titles.includes(title)) {
                res.status(200).send(
                  authUtil.successFalse(
                    statusCode.FORBIDDEN,
                    responseMessage.ALREADY_POST
                  )
                )
                return
              }

              if (title) { post['title'] = title }
              if (content) { post['content'] = content }

              const json2csvParser = new Parser({ fileds: dataField })
              const csvData = json2csvParser.parse(posts)
              fs.writeFileSync(path.join(__dirname, dataPath), csvData + '\n')
              res.status(200).send(
                authUtil.successTrue(
                  statusCode.OK,
                  responseMessage.MODIFY_POST,
                  post
                )
              )
              return
            } else {
              res.status(200).send(
                authUtil.successFalse(
                  statusCode.FORBIDDEN,
                  responseMessage.MISS_MATCH_PW
                )
              )
              return
            }
          }
        }
      }

      res.status(200).send(
        authUtil.successFalse(
          statusCode.NOT_FOUND,
          responseMessage.FETHCED_POST_FAIL
        )
      )
    } catch (err) {
      console.log(err)
      if (err.code !== 'ENOENT') {
        res.status(200).send(
          authUtil.successFalse(
            statusCode.INTERNAL_SERVER_ERROR,
            responseMessage.FILE_ERR
          )
        )
      }
    }
  } else {
    res.status(200).send(
      authUtil.successFalse(
        statusCode.NOT_FOUND,
        responseMessage.FETHCED_POST_FAIL
      )
    )
  }
})

router.delete('/', async (req, res) => {
  const id = req.body.id
  const password = req.body.password
  if (!id || !password) {
    res.status(200).send(
      authUtil.successFalse(
        statusCode.NO_CONTENT,
        responseMessage.OUT_OF_VALUE
      )
    )
    return
  }
  
  if (isFileExist(dataPath)) {
    try {
      const posts = await csvtojson().fromFile(path.join(__dirname, dataPath))
      
      for (let post of posts) {
        for (let prop in post) {
          if (prop === 'id' && post[prop] === id) {
            const savedPassword = post['hashedPassword']
            const salt = post['salt']

            const derivedKey = await crypto.pbkdf2Sync(password, salt, 100, 64, 'SHA512')
            const hashedPassword = derivedKey.toString('base64')

            if (savedPassword === hashedPassword) {
              if (posts.length === 1) {
                fs.unlinkSync(path.join(__dirname, dataPath))
              } else {
                const idx = posts.indexOf(post)
                posts.splice(idx, 1)

                const json2csvParser = new Parser({ fileds: dataField })
                const csvData = json2csvParser.parse(posts)
                fs.writeFileSync(path.join(__dirname, dataPath), csvData + '\n')
              }
            
              res.status(200).send(
                authUtil.successTrue(
                  statusCode.OK,
                  responseMessage.DELETE_POST,
                  post
                )
              )
              return
            } else {
              res.status(200).send(
                authUtil.successFalse(
                  statusCode.FORBIDDEN,
                  responseMessage.MISS_MATCH_PW
                )
              )
              return
            }
          }
        }
      }

      res.status(200).send(
        authUtil.successFalse(
          statusCode.NOT_FOUND,
          responseMessage.FETHCED_POST_FAIL
        )
      )
    } catch (err) {
      console.log(err)
      if (err.code !== 'ENOENT') {
        res.status(200).send(
          authUtil.successFalse(
            statusCode.INTERNAL_SERVER_ERROR,
            responseMessage.FILE_ERR
          )
        )
      }
    }
  } else {
    res.status(200).send(
      authUtil.successFalse(
        statusCode.NOT_FOUND,
        responseMessage.FETHCED_POST_FAIL
      )
    )
  }
})

module.exports = router
