const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");

const router = express.Router();

const STARTER_COINS = 100;

const findUserByEmail = db.prepare(`
  SELECT id, username, email, password_hash
  FROM users
  WHERE email = ?
`);

const findUserByUsername = db.prepare(`
  SELECT id
  FROM users
  WHERE username = ?
`);

const findPlayerStats = db.prepare(`
  SELECT coins, xp, level, games_played
  FROM player_stats
  WHERE user_id = ?
`);

const createUser = db.prepare(`
  INSERT INTO users (username, email, password_hash)
  VALUES (?, ?, ?)
`);

const createPlayerStats = db.prepare(`
  INSERT INTO player_stats (user_id, coins)
  VALUES (?, ?)
`);

const createCoinTransaction = db.prepare(`
  INSERT INTO coin_transactions (
    user_id,
    amount,
    transaction_type,
    source
  )
  VALUES (?, ?, ?, ?)
`);

const registerPlayer = db.transaction((username, email, passwordHash) => {
  const result = createUser.run(username, email, passwordHash);
  const userId = Number(result.lastInsertRowid);

  createPlayerStats.run(userId, STARTER_COINS);

  createCoinTransaction.run(
    userId,
    STARTER_COINS,
    "bonus",
    "registration_starter_bonus"
  );

  return userId;
});

function getPublicPlayer(userId) {
  const user = db.prepare(`
    SELECT id, username, email, created_at
    FROM users
    WHERE id = ?
  `).get(userId);

  if (!user) {
    return null;
  }

  const stats = findPlayerStats.get(userId);

  return {
    ...user,
    stats
  };
}

function requireAuthenticated(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({
      message: "Authentication required."
    });
  }

  next();
}

router.post("/register", async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (
      typeof username !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "Username, email, and password are required."
      });
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
      return res.status(400).json({
        message: "Username must be 3–20 characters and contain only letters, numbers, and underscores."
      });
    }

    if (
      cleanEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
    ) {
      return res.status(400).json({
        message: "Please enter a valid email address."
      });
    }

    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({
        message: "Password must be at least 8 characters and no more than 72 bytes."
      });
    }

    if (findUserByUsername.get(cleanUsername)) {
      return res.status(409).json({
        message: "That username is already taken."
      });
    }

    if (findUserByEmail.get(cleanEmail)) {
      return res.status(409).json({
        message: "An account with that email already exists."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    let userId;

    try {
      userId = registerPlayer(
        cleanUsername,
        cleanEmail,
        passwordHash
      );
    } catch (error) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return res.status(409).json({
          message: "That username or email is already registered."
        });
      }

      throw error;
    }

    req.session.regenerate(error => {
      if (error) {
        return next(error);
      }

      req.session.userId = userId;

      req.session.save(saveError => {
        if (saveError) {
          return next(saveError);
        }

        res.status(201).json({
          message: "Account created successfully!",
          starterBonus: STARTER_COINS,
          player: getPublicPlayer(userId)
        });
      });
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    const user = findUserByEmail.get(email.trim().toLowerCase());

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    req.session.regenerate(error => {
      if (error) {
        return next(error);
      }

      req.session.userId = user.id;

      req.session.save(saveError => {
        if (saveError) {
          return next(saveError);
        }

        res.json({
          message: "Login successful!",
          player: getPublicPlayer(user.id)
        });
      });
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuthenticated, (req, res) => {
  const player = getPublicPlayer(req.session.userId);

  if (!player) {
    return req.session.destroy(() => {
      res.clearCookie("cyberplay.sid");
      res.status(401).json({
        message: "Player account no longer exists."
      });
    });
  }

  res.json({
    player
  });
});

router.post("/logout", (req, res, next) => {
  if (!req.session) {
    return res.json({
      message: "Already logged out."
    });
  }

  req.session.destroy(error => {
    if (error) {
      return next(error);
    }

    res.clearCookie("cyberplay.sid", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });

    res.json({
      message: "Logged out successfully."
    });
  });
});

module.exports = router;
