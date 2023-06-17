const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const { MongoClient } = require('mongodb')
const dotenv = require('dotenv')

dotenv.config()

puppeteer.use(StealthPlugin())
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

const scrapData = async() => {
    const browser = await puppeteer.launch({ headless: "new" })
    const page = await browser.newPage()
    await page.goto(url)
    const todayDate = getDate()
    const postData = await page.evaluate((url, todayDate) => {
        const data = {
            title: document.querySelector('#content article .entry-content .entry-title a').innerHTML.trim(),
            paragraph: document.querySelector('#content article .entry-content p a').innerHTML.trim(),
            image: document.querySelector('#content article .entry-header img').getAttribute('src'),
            link: document.querySelector('#content article .entry-header a').getAttribute('href'),
            date: todayDate,
        }
        return data
    }, url, todayDate)
    await browser.close()
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
    } 
    catch(error){ console.error('Cannot write data:', error) }
    finally{ if(client) client.close() }
}

module.exports = writeData