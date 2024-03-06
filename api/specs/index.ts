import type { VercelRequest, VercelResponse } from '@vercel/node'
import openapi from '../../openapi.json';

const handler = (req: VercelRequest, res: VercelResponse) => {
  return res.json(openapi)
}

const allowCors = fn => async (req: VercelRequest, res: VercelResponse) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )
  if (req.method === 'OPTIONS') {
      res.status(200).end()
      return
  }
  return await fn(req, res)
}

export default allowCors(handler)