import express from 'express';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import responseTime from 'response-time';
import { createClient } from 'redis';
import axios from 'axios'


const argv = yargs(hideBin(process.argv))
.option('port', {
    'alias': 'p',
    'type': 'number',
    'description': 'Port to run the server on',
    'default': 3000
})
.option('target', {
    'alias': 't',
    'type': 'string',
    'description': 'Target server to forward requests to',
    'default': 'https://dummyjson.com/'
})
.option('clear-cache', {
    'type': 'boolean',
    'default': false
})
.argv;

const app = express();
const PORT = argv.port;
const redisClient = createClient({
    host: 'localhost',
    port: 6379
});
redisClient.connect().catch( err => {
    console.error('Failed to connect to Redis', err);
    process.exit(1)
})
const allowedRoutes = ['products', 'users', 'posts'];
const targetServer = argv.target;
const cacheMiddleware = async (req, res, next) => {
    const { route } = req.params;
    const cacheKey = req.originalUrl

    // verify if the request is cached
    const cachedData = await redisClient.get(cacheKey)
    
    if (!cachedData) {
        console.log(`Cache miss for ${cacheKey}`);
        res.header('X-Cache', 'MISS');
        return next();
    }

    console.log(`Cache hit for ${cacheKey}`);
    return res
              .header('X-Cache', 'HIT')
              .json(JSON.parse(cachedData));
}

if (argv.clearCache) {
    console.log(' --clear-cache flag detected. Clearing Redis cache...');
    (async () => {
        await redisClient.flushAll()
    })
}

app.use(responseTime());

app.get('/', (req, res) => {
  res.send('Send a request to this urls:\n\t- Products: /products');
});

app.get('/:route', cacheMiddleware, async (req, res) => {
    const { route } = req.params;
    
    if (!allowedRoutes.includes(route)) {
        return res.status(400).send('Invalid route. Allowed routes are: ' + allowedRoutes.join(', '));
    } 

    try {
        const { data } = await axios.get(`${targetServer}${route}`)
        const cacheKey = req.originalUrl

         
        
        res.json(data)
    }
    catch (error) {
        console.error(`Error fetching ${route} : ${error}`);
        res.status(500).send(`Error fetching ${route}`);        
    }     
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});