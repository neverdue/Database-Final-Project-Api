const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
var knex = require('knex');

const db = knex({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    port : 5432,
    user : 'mayankpandey',
    password : '',
    database : 'finalproject'
  }
});

const register = require('./controllers/register');
const signin = require('./controllers/signin');

const saltRounds = 10;

const app = express();

app.use(express.json());
app.use(cors());

function getRandomString(length) {
    var randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var result = '';
    for ( var i = 0; i < length; i++ ) {
        result += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }
    return result;
}


app.get('/', (req, res) => { res.send('it is working!') });
app.get('/movies', async function (req, res) {
   const genres = await db.select('genre').from('movies').distinct();
   let movies = {};
   for(let obj of genres) {
     if (!movies[obj.genre]) {
       movies[obj.genre] = [];
     }
     movies[obj.genre] = await db.select('*').from('movies').where('genre', '=', obj.genre);
   }
   movies['ALL'] = await db.select().from('movies');
   res.send(movies);
 });
app.get('/theatres', (req, res) => {
  db.select('*').from('theatre').then(data => {
    return db.select('*').from('theatre').then(theatre => {
      res.json(theatre);
    })
  })
})
app.post('/currentTheatre', (req, res) => {
  let { bid } = req.body;
  bid = bid.trim();
  db.select('*').from('theatre').where('bid', '=', bid).then(data => {
    return db.select('*').from('theatre').where('bid', '=', bid).then(theatre => {
      res.json(theatre[0]);
    })
  })
})
app.post('/findMovie', (req, res) => {
  const { title } = req.body;
  db.select('*').from('movies').where('title', '=', title).then(data => {
    return db.select('*').from('movies')
      .where('title', '=', title)
      .then(movie => {
        res.json(movie[0]);
      })
  });
});
app.post('/findDetails', (req, res) => {
  const { title } = req.body;
  db.select('*').from('tickets').where('title', '=', title).then(data => {
    return db.select('*').from('tickets')
      .where('title', '=', title)
      .then(movie => {
        res.json(movie[0]);
      })
  });
})
app.post('/buyTicket', (req, res) => {
  const { email, phoneno, title, director, price, bid } = req.body;
  let refNo = Date.now();
  let hallNo = (Math.floor( Math.random() * 10 ) + 1).toString();
  let seatNo = (getRandomString(1).toUpperCase() + ( Math.floor( Math.random() * 30 ) + 1 )).toString();
  db.transaction(trx => {
    trx.insert({
      email: email,
      phoneno: phoneno,
      title: title,
      director: director,
      price: price,
      refno: refNo,
      hallno: hallNo,
      seatno: seatNo,
      bid: bid
    })
    .into('tickets')
    .returning('email')
    .then(loginEmail => {
      return trx('watch')
        .returning('*')
        .insert({
          phoneno: phoneno,
          email: email,
          title: title,
          director: director,
          bid: bid
        })
        .then(movie => {
          res.json(movie[0]);
        })
    })
    .then(trx.commit)
    .catch(trx.rollback)
  })
    .catch(err => res.status(400).json(err))
})
app.post('/getCountTickets', (req, res) => {
  const { email, phoneno } = req.body;
  db('tickets').count('*').where('email', '=', email).andWhere('phoneno', '=', phoneno).then(data => {
    return db('tickets').count('*').where('email', '=', email).andWhere('phoneno', '=', phoneno).then(count => {
      res.json(count[0]);
    })
  })
})
app.post('/myTickets', (req, res) => {
  let { email } = req.body;
  email = email.trim();
  db('tickets').where('email', '=', email).then(data => {
    return db.select('*').from('movies').innerJoin('tickets', 'tickets.title', '=', 'movies.title').where('email', '=', email).then(movies => {
      res.json(movies);
    })
  })
})
app.put('/changePassword', (req, res) => {
  let { email, currPass, newPass, newPassConfirm } = req.body;
  email = email.trim();
  db.select('email', 'hash').from('login')
    .where('email', '=', email)
    .then(data => {
      const isValid = bcrypt.compareSync(currPass, data[0].hash);
      if (isValid && newPass === newPassConfirm) {
        return db('login')
          .where('email', '=', email)
          .update('hash', bcrypt.hashSync(newPass, saltRounds))
          .returning('email')
          .then(data => {
            res.json(data[0])
          })
      } else {
        res.status(400).json(`Invalid credentials`)
      }
    })
    .catch(err => res.status(400).json(err))
})
app.post('/signin', (req, res) => { signin.handleSignIn(req, res, db, bcrypt) });
app.post('/register', (req, res) => { register.handleRegister(req, res, db, bcrypt, saltRounds) });

app.listen(process.env.PORT || 3000, () => {
  console.log(`app is running on port ${process.env.PORT}`);
})
