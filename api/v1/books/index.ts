import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Prisma, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        let idStr = req.query.id
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
                    if (book === null) {
                        return res.status(404).json({
                            status: false,
                            message: "book not found",
                            data: null
                        })
                    }

                    return res.status(200).json({
                        status: true,
                        message: "success get detail book",
                        data: book
                    })
                }

                const books = await prisma.book.findMany()
                return res.status(200).json({
                    status: true,
                    message: "success get list of book",
                    data: books
                })
            }

            case "POST": {
                let data = req.body as Prisma.BookCreateInput
                const book = await prisma.book.create({
                    data
                })
                return res.status(201).json({
                    status: true,
                    message: "success create a book",
                    data: book
                })
            }

            case "PUT": {
                const b = await prisma.book.findFirst({
                    select: {
                        id: true
                    },
                    where: { id }
                })
                if (b === null) {
                    return res.status(404).json({
                        status: false,
                        message: "book not found",
                        data: null
                    })
                }

                let data = req.body as Prisma.BookUpdateInput
                const book = await prisma.book.update({
                    data,
                    where: { id }
                })
                return res.status(200).json({
                    status: true,
                    message: "success update a book detail",
                    data: book
                })
            }

            case "DELETE": {
                if (req.query.delete == "all") {
                    await prisma.$executeRaw`TRUNCATE TABLE Book;`
                    return res.status(200).json({
                        status: true,
                        message: "success delete all book",
                        data: null
                    })
                }

                const b = await prisma.book.findFirst({
                    select: {
                        id: true
                    },
                    where: { id }
                })
                if (b === null) {
                    return res.status(404).json({
                        status: false,
                        message: "book not found",
                        data: null
                    })
                }

                const book = await prisma.book.delete({
                    where: { id }
                })
                return res.status(200).json({
                    status: true,
                    message: "success delete book",
                    data: book
                })
            }

            default: {
                return res.status(404).json({
                    status: false,
                    message: "bad route",
                    data: null
                })
            }
        }
    } catch(err) {
        console.error("catch-a-runtime-error: ", err)
        return res.status(500).json({
            status: false,
            message: "internal server error",
            data: null
        })
    }
}
