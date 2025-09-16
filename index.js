import express from 'express';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';



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
const allowedRoutes = ['products', 'users', 'posts'];
const serverTarget = argv.target;

app.get('/', (req, res) => {
  res.send('Send a request to this urls:\n\t- Products: /products');
});

app.get('/:route', (req, res) => {
    const { route } = req.params;

    if (!allowedRoutes.includes(route)) {
        return res.status(400).send('Invalid route. Allowed routes are: ' + allowedRoutes.join(', '));
    } 

    fetch(`${serverTarget}/${route}`)
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }

        return response.json();
    })
    .then(data => {
        res.json(data);
    })
    .catch(error => {
        console.error(`Error fetching ${route} : ${error}`);
        res.status(500).send(`Error fetching ${route}`);
    });
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});