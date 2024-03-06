import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Prisma, PrismaClient } from '@prisma/client'

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const prisma = new PrismaClient()
    
        let { idStr } = req.query
        if (Array.isArray(idStr)) {
            idStr = idStr[0]
        }
        const id = parseInt(idStr)
    
        switch (req.method?.toUpperCase()) {
            case "GET": {
                if (id > 0) {
                    const book = await prisma.book.findFirst({
                        where: { id }
                    })
                    return res.status(200).json(book)
                }

                const books = await prisma.book.findMany()
                return res.status(200).json(books)
            }

            case "POST": {
                let data = req.body as Prisma.BookCreateInput
                const book = await prisma.book.create({
                    data
                })
                return res.status(201).json(book)
            }

            case "PUT": {
                let data = req.body as Prisma.BookUpdateInput
                const book = await prisma.book.update({
                    data,
                    where: { id }
                })
                return res.status(200).json(book)
            }

            case "DELETE": {
                const book = await prisma.book.delete({
                    where: { id }
                })
                return res.status(201).json(book)
            }
            default: {
                return res.status(404).json({
                    "message": "Route Not Found"
                })
            }
        }
    } catch(err) {
        console.error("error: ", err)
        return res.status(500).json({
            "message": "Internal Server Error"
        })
    }
}
