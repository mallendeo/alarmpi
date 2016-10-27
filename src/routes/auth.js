import { checkAdmin } from './middleware/admin'

const jwt = require('jsonwebtoken')

const generateToken = (name, expire = 600) =>
  jwt.sign({ name }, process.env.JWT_SECRET, {
    issuer: 'pupper',
    expiresIn: expire
  })

export default (router, db) => {
  router.post('/token/renew', (req, res) => {
    const key = db.apiKeys.get(req.body.key)
    if (key) return res.json({ token: generateToken(key.name) })

    res.status(401).json({ error: 'Invalid key' })
  })

  router.post('/token/verify', (req, res) => {
    const token = req.headers.authorization.replace('Bearer ', '')
    try {
      const verifiedToken = jwt.verify(token, process.env.JWT_SECRET)
      res.json({ valid: true, token: verifiedToken })
    } catch (e) {
      res.json({ valid: false, error: e.message })
    }
  })

  // Generate key for admin after install
  router.get('/apiKey/init', (req, res) => {
    if (db.apiKeys.all().length) {
      return res
        .status(403)
        .json({ error: 'Initial API key already claimed.' })
    }

    const apiKey = db.apiKeys.create('Admin')
    res.json({ data: apiKey })
  })

  router.post('/apiKey/claim', (req, res) => {
    try {
      const key = db.apiKeys.claim(req.body.code)
      res.json({ data: key })
    } catch (e) {
      return res
        .status(403)
        .json({ error: e.message })
    }
  })

  router.get('/apiKey', checkAdmin, (req, res) => {
    res.json({ data: db.apiKeys.all() })
  })

  router.post('/apiKey', checkAdmin, (req, res) => {
    if (!req.body.name) {
      return res
        .status(400)
        .json({ error: 'name param required' })
    }

    try {
      const apiKey = db.apiKeys.create(req.body.name)
      res.json({ data: apiKey })
    } catch (e) {
      res.status(501).json({ error: e.message })
    }
  })

  router.delete('/apiKey/:key', checkAdmin, (req, res) => {
    if (!req.params.key) {
      return res
        .status(400)
        .json({ error: 'key param required' })
    }

    const apiKey = db.apiKeys.remove(req.params.key)
    res.json({ data: apiKey })
  })
}
