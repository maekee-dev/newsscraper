const puppeteer = require('puppeteer')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const path = require('path')
const serveStatic = require('serve-static')
const { MongoClient } = require('mongodb')
const express = require('express')
const dotenv = require('dotenv')

dotenv.config()

const url = 'https://www.ilpost.it'

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

const getDate = () => {
    const now = new Date()
    const day = now.getDate().toString().padStart(2, '0')
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const year = now.getFullYear()
    const formattedDate = day + '/' + month + '/' + year
    return formattedDate
}

const scrapData = async() => {
    const browser = await puppeteer.launch({ headless: "new" })
    const page = await browser.newPage()
    await page.goto(url)
    const todayDate = getDate()
    const postData = await page.evaluate((url, todayDate) => {
        const data = {
            title: document.querySelector('._article-open-standard_vpo8l_1 ._article-content_vpo8l_30 a ._article-title_1aaqi_4').innerHTML.trim(),
            paragraph: document.querySelector('._article-open-standard_vpo8l_1 ._article-container_vpo8l_84 a p').innerHTML.trim(),
            image: document.querySelector('._article-open-standard_vpo8l_1 ._article-image_vpo8l_52 img').getAttribute('src'),
            link: document.querySelector('._article-open-standard_vpo8l_1 ._article-content_vpo8l_30 a').getAttribute('href'),
            date: todayDate
        }
        return data
    }, url, todayDate)
    await browser.close()
    console.log(postData)
    return postData
}

const writeData = async() => {
    const data = await scrapData()
    let client
    try{
        client = await dbConnect()
        const db = client.db('ScrapedArticles')
        const collection = db.collection('Articles')
        const isOld = await collection.findOne({ title: data.title })
        if (!isOld) await collection.insertOne(data)
        return data
    } 
    catch(error){ console.error('Cannot write data:', error) }
    finally{ if(client) client.close() }
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

const updateData = async(_req, res, next) => {
    res.locals.data = await writeData()
    next()
}

app.get('/', deployData, (_req, res) => {
    res.render('index', { data: res.locals.data })
})

app.get('/json', deployData, (_req, res) => {
    res.json(res.locals.data)
})

app.get('/update', updateData, (_req, res) => {
    res.json(res.locals.data)
})

app.listen(port, () => {
    return console.log(`Server is listening on ${port}`)
})