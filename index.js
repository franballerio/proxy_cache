import express from 'express';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import responseTime from 'response-time';
import { createClient } from 'redis';


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
    'default': 'https://dummyjson.com'
})
.argv;

const app = express();
const PORT = argv.port;
const redisClient = createClient({
    host: 'localhost',
    port: 6379
});
redisClient.connect()

const allowedRoutes = ['products', 'users', 'posts'];
const serverTarget = argv.target;

app.use(responseTime());

app.get('/', (req, res) => {
  res.send('Send a request to this urls:\n\t- Products: /products');
});

app.get('/clear-cache', async (req, res) => {
    await redisClient.flushAll();
    res.send('Cache cleared');
});

app.get('/:route', async (req, res) => {
    const { route } = req.params;

    if (!allowedRoutes.includes(route)) {
        return res.status(400).send('Invalid route. Allowed routes are: ' + allowedRoutes.join(', '));
    } 

    // verify is the request is cached
    const cachedData = await redisClient.get(route)

    if (!cachedData) {
        fetch(`${serverTarget}/${route}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }

            return response.json();
        })
        .then(async (data) => {

            await redisClient.set(route, JSON.stringify(data), 'EX', 300);

            res
            .header('X-Cache', 'MISS')
            .json(data);
        })
        .catch(error => {
            console.error(`Error fetching ${route} : ${error}`);
            res.status(500).send(`Error fetching ${route}`);
        });        
    } else {
        console.log(`Cache hit for ${route}`);
        return res
                  .header('X-Cache', 'HIT')
                  .json(JSON.parse(cachedData));
    }
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});