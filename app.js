
const express = require('express')
const path = require('path')
const serveStatic = require('serve-static')
const cheerio = require("cheerio")
const axios = require("axios")

const getDate = () => {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;
    return formattedDate
}

const performScraping = async () => {    
    const axiosResponse = await axios.request({
        method: "GET",
        url: "https://www.ilpost.it",
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
        }
    })
    const $ = cheerio.load(axiosResponse.data)
    const article = $("#content").find("article").first()
    const title = article.find(".entry-content").find(".entry-title").text()
    const paragraph = article.find(".entry-content").find("p").text().trim()
    const link = article.find("header").find("figure").find("a").attr("href")
    const image = article.find("header").find("figure").find("a").find("img").attr("src")
    const date = getDate()
    const scrapedData = {
        title: title,
        paragraph: paragraph,
        image: image,
        link: link,
        date: date,
    }
    return scrapedData
}


const app = express() 
app.use(serveStatic(path.join(__dirname, 'public'))) 
app.set('views', __dirname + '/public/view/');
app.set('view engine', 'ejs');

app.get('', (req, res) => {
    performScraping()
    .then((resultData) => {
        res.render('index', { data: resultData })
    })
    .catch((error) => {
        resultData = {
            title: 'error',
            paragraph: 'error',
            image: 'error',
            link: 'error',
            date: 'error'
        }
        res.render('index', { data: resultData })
    })
})

app.get('/json', (req, res) => {
    performScraping()
    .then((resultData) => {
        res.json(resultData)
    })
    .catch((error) => {
        console.error(error)
        res.json( { error: 'Si è verificato un errore durante lo scraping dei dati.' })
    })
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.info(`App listening on port ${PORT}`))

module.exports = app