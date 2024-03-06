import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Prisma, PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'


// Create a single prisma client for interacting with your database
const prisma = new PrismaClient()

// Create a single supabase client for interacting with your database
const supabase = createClient(
    process.env.SUPABASE_CLIENT_URL || '', 
    process.env.SUPABASE_ANON_PUB_KEY || '',
    {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        }
    }
)

const handler = async (req: VercelRequest, res: VercelResponse) => {
    const str = (v: string | string[]) => {
        if (Array.isArray(v)) return v[0];
        return v;
    };

    try {
        let idStr = str(req.query?.id || '0')
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

                let { take, page, author, title, desc } = req.query

                let meta = {
                    take: parseInt(str(take || '10')),
                    page: parseInt(str(page || '1')),
                    total: 0
                }

                meta.total = await prisma.book.count({where: {
                        title: {
                            contains: str(title || ''),
                        },
                        desc: {
                            contains: str(desc || ''),
                        },
                        author: {
                            contains: str(author || ''),
                        },
                    },
                })

                const books = await prisma.book.findMany({
                    skip: (meta.take * meta.page) - meta.take,
                    take: meta.take,
                    where: {
                        title: {
                            contains: str(title || ''),
                        },
                        desc: {
                            contains: str(desc || ''),
                        },
                        author: {
                            contains: str(author || ''),
                        },
                    },
                    orderBy: {
                        id: 'desc'
                    }
                })

                return res.status(200).json({
                    status: true,
                    meta: meta,
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
                    let { error } = await supabase.rpc('reset_book_table')
                    if (error) {
                        console.error("supabase-error: ", error)
                        return res.status(500).json({
                            status: false,
                            message: "failed delete all book",
                            data: null
                        })
                    }

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
        console.error("runtime-error: ", err)
        return res.status(500).json({
            status: false,
            message: "internal server error",
            data: null
        })
    }
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