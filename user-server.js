const restify = require('restify');
const util = require('util');
const { SQUser,
    connectDB,
    userParams,
    sanitizedUser,
    findOneUser,
    createUser } = require('./users-sequelize');

const DBG = require('debug');
const log = DBG("users:service");
const error = DBG("users:error");

const apiKey = [{ user: "them", key: "D4ED43C0-8BD6-4FE2-B358-7C0E230D11EF" }];

// 自定义的中间件，检查request中是否 有验证的user+key
const check = (req, res, next) => {
    if (req.authorization && req.authorization.basic) {
        let found = false;
        for (let auth of apiKey) {
            if (auth.key === req.authorization.basic.password
                && auth.user === req.authorization.basic.username) {
                found = true;
                break;
            }
        }
        if (found) {
            next();
        }
        else {
            res.send(401, new Error("Not Authenticated"));
            next(false);
        }
    } else {
        res.send(500, new Error("Not Authorization Key"));
        next(false);
    }

}

// 创建REST server
const server = restify.createServer({
    name: "User-Auth-Service",
    version: "0.0.1"
});

// 
server.use(restify.plugins.authorizationParser());
server.use(check);  // 在通过第一个中间件处理后检查是否验证成功
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser({
    mapParams: true
}));

server.listen(process.env.PORT, "localhost", function () {
    log(server.name + ' listening at ' + server.url);
});

process.on("uncaughtException", err => {
    console.error("UNCAUGHT EXCEPTION" + (err.stack || err));
    process.exit(1);
})

process.on("unhandledRejection", (reason, p) => {
    console.error(`UNHANDLED PROMISE REJECTION: ${util.inspect(p)} reason: ${reason}`);
    process.exit(1);
});

server.post("/create-user", async (req, res, next) => {
    try {
        await connectDB();
        let result = await createUser(req);
        res.contentType = "json";
        res.send(result);
        log("创建成功!!");
        next(false);
    } catch (err) {
        error(err);
        res.send(500, err);
        next(false);
    }
})

server.post("/find-or-create", async (req, res, next) => {
    try {
        await connectDB();
        let user = await findOneUser(req.params.userParams);
        if (!user) {
            user = await createUser(req);
            if (!user) throw new Error("No user created");
        }
        res.contentType = "json";
        res.send(user);
        return next(false);
    } catch (err) {
        res.send(500, err);
        next(false);
    }
})

