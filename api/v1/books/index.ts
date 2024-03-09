import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Prisma, PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import Joi from 'joi';
import JoiDate from '@joi/date';

Joi.extend(JoiDate)

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
    try {
        switch (req.method?.toUpperCase()) {
            case 'GET': {
                if (req.query['id'] || req.query['id'] === '') {
                    return await getDetailBook(req, res)
                }
                return await getListBook(req, res)
            }

            case 'POST': {
                return await createBook(req, res)
            }

            case 'PUT': {
                return await updateBook(req, res)
            }

            case 'DELETE': {
                if (req.query['delete'] || req.query['delete'] === '') {
                    if (req.query.delete !== 'all') {
                        return res.status(400).json({
                            status: false,
                            message: 'unsupported delete action',
                            data: null
                        })
                    }
                    return await deleteAllBook(res)
                }

                return await deleteBook(req, res)
            }

            default: {
                return res.status(404).json({
                    status: false,
                    message: 'bad route',
                    data: null
                })
            }
        }
    } catch(err) {
        console.error('runtime-error: ', err)
        return res.status(500).json({
            status: false,
            message: 'internal server error',
            data: null
        })
    }
}


type Meta = {
    take: number
    page: number
    total: number
    totalPage: number
    filter: { [key: string]: string } | null
}

const ArrayToString = (v: string | string[]) => {
    if (Array.isArray(v)) return v[0];
    return v;
};

const getListBook = async (req: VercelRequest, res: VercelResponse) => {
    const { take = '10', page = '1', author = '', title = '', desc = '' } = req.query

    let meta: Meta = {
        take: parseInt(ArrayToString(take)),
        page: parseInt(ArrayToString(page)),
        total: 0,
        totalPage: 0,
        filter: null
    }

    Array('author', 'title', 'desc').forEach((v) => {
        if (req.query[v] || req.query[v] === '') {
            if (meta.filter == null) {
                meta.filter = {}
            }
            meta.filter[v] = ArrayToString(req.query[v])
        }
    })

    if (meta.take >= 20) {
        meta.take = 20
    }

    meta.total = await prisma.book.count({
        where: {
            title: {
                contains: ArrayToString(title),
            },
            desc: {
                contains: ArrayToString(desc),
            },
            author: {
                contains: ArrayToString(author),
            },
        },
    })

    const books = await prisma.book.findMany({
        skip: (meta.take * meta.page) - meta.take,
        take: meta.take,
        where: {
            title: {
                contains: ArrayToString(title),
            },
            desc: {
                contains: ArrayToString(desc),
            },
            author: {
                contains: ArrayToString(author),
            },
        },
        orderBy: {
            id: 'desc'
        }
    })

    meta.totalPage = Math.ceil(meta.total / meta.take);
    if (meta.totalPage <= 0) meta.totalPage = 1;

    return res.status(200).json({
        status: true,
        meta: meta,
        message: 'success get list of book',
        data: books
    })
}

const getDetailBook = async (req: VercelRequest, res: VercelResponse) => {
    const { id = '0' } = req.query
    const idNum = parseInt(ArrayToString(id)) || 0

    if (idNum <= 0) {
        return res.status(404).json({
            status: false,
            message: 'book not found',
            data: null
        })
    }
    
    const book = await prisma.book.findFirst({
        where: { 
            id: idNum
        }
    })
    if (book === null) {
        return res.status(404).json({
            status: false,
            message: 'book not found',
            data: null
        })
    }

    return res.status(200).json({
        status: true,
        message: 'success get detail book',
        data: book
    })
}

const createBook = async (req: VercelRequest, res: VercelResponse) => {
    const schema = Joi.object({
        title: Joi
            .string()
            .min(1)
            .max(50)
            .alphanum()
            .allow(' ')
        .required(),

        desc: Joi
            .string()
            .max(255)
            .alphanum()
            .allow(' ')
        .optional(),

        author:  Joi
            .string()
            .min(1)
            .max(50)
            .alphanum()
            .allow(' ')
        .required(),

        createdAt: Joi
            .date()
            .format("YYYY-MM-DDTHH:mm:ssZ")
        .optional(),

        updatedAt: Joi
            .date()
            .format("YYYY-MM-DDTHH:mm:ssZ")
        .optional(),
    })
    
    const { error } = schema.validate(req.body, {
        abortEarly: false,
    })
    if(error) {
        res.status(422).json({
            status: false,
            message: 'unprocessable entity',
            data: null,
            error: error
        })
    }

    const data = req.body as Prisma.BookCreateInput
    const book = await prisma.book.create({
        data
    })
    return res.status(201).json({
        status: true,
        message: 'success create a book',
        data: book
    })
}

const updateBook = async (req: VercelRequest, res: VercelResponse) => {
    const { id = '0' } = req.query
    const idNum = parseInt(ArrayToString(id)) || 0

    if (idNum <= 0) {
        return res.status(404).json({
            status: false,
            message: 'book not found',
            data: null
        })
    }

    const schema = Joi.object({
        title: Joi
            .string()
            .min(1)
            .max(50)
            .alphanum()
            .allow(' ')
        .required(),

        desc: Joi
            .string()
            .max(255)
            .alphanum()
            .allow(' ')
        .optional(),

        author:  Joi
            .string()
            .min(1)
            .max(50)
            .alphanum()
            .allow(' ')
        .required(),

        createdAt: Joi
            .date()
            .format("YYYY-MM-DDTHH:mm:ssZ")
        .optional(),

        updatedAt: Joi
            .date()
            .format("YYYY-MM-DDTHH:mm:ssZ")
        .optional(),
    })
    
    const { error } = schema.validate(req.body, {
        abortEarly: false,
    })
    if(error) {
        res.status(422).json({
            status: false,
            message: 'unprocessable entity',
            data: null,
            error: error
        })
    }

    const b = await prisma.book.findFirst({
        select: {
            id: true
        },
        where: { 
            id: idNum
        }
    })
    if (b === null) {
        return res.status(404).json({
            status: false,
            message: 'book not found',
            data: null
        })
    }

    const data = req.body as Prisma.BookUpdateInput
    const book = await prisma.book.update({
        data,
        where: { 
            id: idNum
        }
    })
    return res.status(200).json({
        status: true,
        message: 'success update a book detail',
        data: book
    })
}

const deleteBook = async (req: VercelRequest, res: VercelResponse) => {
    const { id = '0' } = req.query
    const idNum = parseInt(ArrayToString(id)) || 0

    const b = await prisma.book.findFirst({
        select: {
            id: true
        },
        where: { 
            id: idNum
        }
    })
    if (b === null) {
        return res.status(404).json({
            status: false,
            message: 'book not found',
            data: null
        })
    }

    const book = await prisma.book.delete({
        where: { 
            id: idNum
        }
    })
    return res.status(200).json({
        status: true,
        message: 'success delete book',
        data: book
    })
}

const deleteAllBook = async (res: VercelResponse) => {
    const { error } = await supabase.rpc('reset_book_table')
    if (error) {
        console.error('supabase-error: ', error)
        return res.status(500).json({
            status: false,
            message: 'failed delete all book',
            data: null
        })
    }

    return res.status(200).json({
        status: true,
        message: 'success delete all book',
        data: null
    })
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
