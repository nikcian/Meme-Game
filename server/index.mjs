import express, { request, response } from "express";
import morgan from "morgan";
import cors from "cors";
import { check, validationResult } from "express-validator";
import passport from "passport";
import LocalStrategy from "passport-local";
import session from "express-session";
import UserDao from "./dao/userDAO.mjs";
import Controller from "./controller.mjs";

// init express
const app = new express();
const port = 3001;

//middleware
app.use(express.json());
app.use(morgan("dev"));
app.use('/static', express.static('./public'));

const corsOptions = {
  origin: "http://localhost:5173",
  optionsSuccessStatus: 200,
  credentials: true,
};
app.use(cors(corsOptions));

passport.use(
  new LocalStrategy(async function verify(username, password, cb) {
    const user = await UserDao.getUser(username, password);
    if (!user) {
      return cb(null, false, "Incorrect username or password.");
    }
    return cb(null, user);
  })
);

passport.serializeUser(function (user, cb) {
  cb(null, user);
});

passport.deserializeUser(function (user, cb) {
  return cb(null, user);
});

app.use(
  session({
    secret: "you shall not pass",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.authenticate("session"));

const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: "Not authorized" });
};

/* ROUTES */

/*** Users APIs ***/

// POST /api/sessions
app.post('/api/sessions', function(req, res, next) {
  passport.authenticate('local', (err, user, info) => {
    if (err)
      return next(err);
      if (!user) {
        return res.status(401).json({ error: info});
      }
      req.login(user, (err) => {
        if (err)
          return next(err);
        return res.json(req.user);
      });
  })(req, res, next);
});

// GET /api/sessions/current
app.get('/api/sessions/current', (req, res) => {
  if(req.isAuthenticated()) {
    res.status(200).json(req.user);}
  else
    res.status(401).json({error: 'Not authenticated'});
});

// DELETE /api/session/current
app.delete('/api/sessions/current', (req, res) => {
  req.logout(() => {
    res.end();
  });
});

/*** Memes APIs ***/

app.get('/api/images/pick', async(req, res) => {
  try{
    const image = await Controller.pickImage();
    res.json(image);
  } catch {
    res.status(500).end();
  }
});

//GET /api/images
app.get('/api/images', isLoggedIn, async(req, res) => {
  try{
    const images = await Controller.getRandomImages();
    res.json(images);
  } catch {
    res.status(500).end();
  }
});

//GET /api/images/<imageId>/captions
app.get('/api/images/:imageId/captions', async(req, res) => {
  try {
    const deck = await Controller.getCaptionsDeck(Number(req.params.imageId));
    if(deck.error) {
      res.status(404).json(deck);
    } else {
      res.json(deck);
    }
  } catch {
    res.status(500).end();
  }
});

//POST /api/images/<imageId>/captions
app.post('/api/images/:imageId/captions', async (req, res) => {
  const imageId = Number(req.params.imageId);
  const captions = req.body;
  if (!Array.isArray(captions)) {
    return res.status(400).send('Il body della richiesta deve essere una lista di numeri');
  }
  try {
    const correctCaptions = await Controller.getCorrectCaptionsFromDeck(imageId, captions);
    if(correctCaptions.error) {
      res.status(404).json(correctCaptions);
    } else {
      res.json(correctCaptions);
    }
  } catch (err) {
    res.status(503).end();
  }
});

app.get('/api/history', isLoggedIn, async (req, res) => {
  try{
    const historyList = await Controller.getHistoryPreview(req.user.id);
    res.json(historyList);
  } catch {
    res.status(500).end();
  }
});

app.get('/api/history/:id', isLoggedIn, async (req, res) => {
  try{
    const match = await Controller.getHistoryMatch(req.params.id);
    if(match.err) {
      res.status(404).json(match);
    } else {
      res.json(match);
    }
  } catch {
    res.status(500).end();
  }
})

app.post('/api/history', isLoggedIn, async (req, res) => {
  try {
    const rounds = req.body;
    if (!Array.isArray(rounds)) {
      return res.status(400).send('Il body della richiesta deve essere una lista');
    }
    await Controller.saveMatch(req.user.id, rounds);
    res.status(201).end();
  } catch (err) {
    res.status(503).json({error: `Database error during the save: ${err}`});
  }
})





// activate the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
