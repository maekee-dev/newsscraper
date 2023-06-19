const path = require('path')
const serveStatic = require('serve-static')
const { MongoClient } = require('mongodb')
const express = require('express')
const dotenv = require('dotenv')

dotenv.config()

const dbConnect = async() => {
    try{
        const client = new MongoClient(
            'mongodb+srv://' + process.env.DBUSR + ':' + process.env.DBPSW + '@cluster.qdcxe1q.mongodb.net/?retryWrites=true&w=majority',
            { useNewUrlParser: true, useUnifiedTopology: true }
        )
        await client.connect()
        return client
    } catch(error){
        console.error('Cannot connect to db:', error)
        throw error
    }
}

const getData = async() => {
    let client
    try{
        client = await dbConnect()
        const db = client.db('ScrapedArticles')
        const collection = db.collection('Articles')
        const data = await collection.findOne({}, { sort: { _id: -1 } })
        delete data._id
        return data
    } 
    catch(error){ console.error('Cannot read data:', error) } 
    finally{ if(client) client.close() }
}

const app = express()
const port = process.env.PORT || 8080
app.use(serveStatic(path.join(__dirname, '/public'))) 
app.set('views', __dirname + '/public/view/');
app.set('view engine', 'ejs');

const deployData = async(_req, res, next) => {
    res.locals.data = await getData()
    next()
}

app.get('/', deployData, (_req, res) => {
    res.render('index', { data: res.locals.data })
})

app.get('/json', deployData, (_req, res) => {
    res.json(res.locals.data)
})

app.listen(port, () => {
    return console.log(`Server is listening on ${port}`)
})