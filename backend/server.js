const PORT = 5050;

const fastify = require("fastify")({
  logger: true,
});

// ---------- JWT Setup -----------------

const jwt = require("@fastify/jwt");
const bcrypt = require("bcrypt");

fastify.register(jwt, {
  secret: "secretkey",
});

// ---------- CORS Setup -----------------------------------

const cors = require("@fastify/cors");

fastify.register(cors, {
  origin: (origin, cb) => {
    const hostname = new URL(origin).hostname;
    if (hostname === "localhost") {
      //  Request from localhost will pass
      cb(null, true);
      return;
    }
    // Generate an error on other origins, disabling access
    cb(new Error("Not allowed"), false);
  },
});

// -------------- Fastify Sequelize Setup --------------

const { Sequelize, DataTypes, UUIDV4 } = require("sequelize");

const sequelize = new Sequelize(
  "postgres://postgres:postgres@localhost:5432/postgres"
);

const User = sequelize.define("user", {
  userid: {
    type: DataTypes.UUID,
    defaultValue: UUIDV4,
    allowNull: false,
    unique: true,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
});

(async () => {
  await sequelize.sync({ alter: true });
})();

// ------------- Fastify Protected Routes ---------------

// function authenticate(request, reply, done) {
//   // Perform authentication logic here
//   // ...

//   // If authentication fails, send an error
//   if (!authenticated) {
//     reply.status(401).send({ error: "Unauthorized" });
//     return;
//   }

//   done();
// }

// fastify.get(
//   "/protected",
//   {
//     preHandler: authenticate,
//   },
//   (request, reply) => {
//     reply.send({ message: "Protected route" });
//   }
// );

// -------------- Fastify Requests With Sequelize ---------

fastify.post("/register", async (request, reply) => {
  const { username, password } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  // Store the new user in your database
  await User.create({ username: username, password: hashedPassword });

  const token = fastify.jwt.sign({ username });

  reply.send({ token });
});

fastify.post("/login", async (request, reply) => {
  const { username, password } = request.body;

  // Retrieve the user from your database
  const users = await User.findOne({
    attributes: ["password"],
    where: {
      username: username,
    },
  });

  const hashedPassword = users.dataValues.password

  const user = { password: hashedPassword };
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    reply.status(401).send({ error: "Invalid credentials" });
    return;
  }
  const token = fastify.jwt.sign({ username });
  reply.send({ token });
});

// ----------------Fastify Server Start -----------------

fastify.listen({ port: PORT }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`Server is listening on ${address}`);
});

// // ---------- Postgres Connection Without Sequelize -------------------------

// fastify.register(require("@fastify/postgres"), {
//   connectionString: "postgres://postgres:postgres@localhost/postgres",
// });

//------------ Get Users From PostgreSQL database --------------

// fastify.get("/users", async (request, reply) => {
//   const query = "SELECT * FROM users";
//   const { rows } = await fastify.pg.query(query);

//   reply.send(rows);
// });

// --------------- Fastify Requests For Without Sequelize -----------------

// fastify.get("/", (request, reply) => {
//   reply.send({ hello: "world" });
// });

// fastify.post("/register", async (request, reply) => {
//   const { username, password } = request.body;
//   const hashedPassword = await bcrypt.hash(password, 10);

//   // Store the new user in your database
//   const query = `INSERT INTO USERS(username,password) VALUES('${username}','${hashedPassword}')`;
//   await fastify.pg.query(query);

//   const token = fastify.jwt.sign({ username });

//   reply.send({ token });
// });

// fastify.post("/login", async (request, reply) => {
//   const { username, password } = request.body;

//   // Retrieve the user from your database
//   const query = `SELECT username, password from users where username='${username}'`;
//   const response = await fastify.pg.query(query);

//   const hashedPassword = response.rows[0].password;

//   const user = { password: hashedPassword };
//   const isValid = await bcrypt.compare(password, user.password);
//   if (!isValid) {
//     reply.status(401).send({ error: "Invalid credentials" });
//     return;
//   }
//   const token = fastify.jwt.sign({ username });
//   reply.send({ token, response });
// });

// fastify.get("/users", async (request, reply) => {
//   const users = await sequelize.models.user.findAll();
//   console.log("\n\n", users, "\n\n");
//   reply.send(users);
// });
