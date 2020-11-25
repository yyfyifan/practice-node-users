const program = require('commander');
const { type } = require('os');
const restify = require('restify-clients');
const util = require('util');

let client_port;
let client_host;
let client_version = "*";
let client_protocol;
let authid = 'them';
let authcode = "D4ED43C0-8BD6-4FE2-B358-7C0E230D11EF";

const client = program => {
    if (typeof process.env.PORT === 'string') {
        client_port = Number.parseInt(process.env.PORT);
    }
    if (typeof program.port === 'string') {
        client_port = Number.parseInt(program.port);
    }
    if (typeof program.host === 'string') {
        client_host = program.host;
    }
    if (typeof program.url === 'string') {
        let purl = new URL(program.url);
        if (purl.host && purl.host !== '') {
            client_host = purl.host;
        }
        if (purl.port) {
            client_port = purl.port;
        }
        if (purl.protocol) {
            client_protocol = prul.protocol;
        }
    }

    let connect_url = new URL("http://localhost:5858");
    if (client_protocol) {
        connect_url.protocol = client_protocol;
    }
    if (client_host) {
        connect_url.host = client_host;
    }
    if (client_port) {
        connect_url.port = client_port;
    }
    let client = restify.createJSONClient({
        url: connect_url.href,
        version: client_version
    });
    client.basicAuth(authid, authcode);
    return client;
}

program.option("-p, --port <port>", "Port number for user server, if using localhost")
    .option("-h, --host <host>", "Host number for user server, if using localhost")
    .option("-u, --url <url>", "Connection URL for user server, if using a remote server");

// subcommand to add a new user
program
    .command("add <username>")
    .description("Add a user to the user server")
    .option("--password <password>", "Password for new user")
    .option("--family-name <familyName>", "Family name, or last name of the user")
    .option("--given-name <givenName>", "Given name, or first name of the user")
    .option("--middle-name <middleName>", "Given name, or first name of the user")
    .option("--email <email>", "Email address for the user")
    .action((username, cmdObj) => {
        const topost = {
            username, password: cmdObj.password, provider: "local",
            familyName: cmdObj.familyName,
            givenName: cmdObj.givenName,
            middleName: cmdObj.middleName,
            emails: [],
            photos: []
        };
        if (typeof cmdObj.email !== 'undefined') {
            topost.emails.push(cmdObj.email);
        }
        // 获取REST服务器的连接，然后对该URL发送POST请求，携带topost数据，在callback中处理结果
        client(program).post("/create-user", topost, (err, req, res, obj) => {
            if (err) {
                console.error(err.stack);
            } else {
                console.log("Created " + util.inspect(obj));
            }
        })
    })

// subcommand to find or create a user
program
    .command("find-or-create <username>")
    .description("Add a user to the user server")
    .option("--password <password>", "Password for new user")
    .option("--family-name <familyName", "Family name, or last name of the user")
    .option("--given-name <givenName>", "Given name, or first name of the user")
    .option("--middle-name <middleName>", "Middle name of the user")
    .option("--email <email>", "Email address for the user")
    .action((username, cmdObj) => {
        const topost = {
            username, 
            password: cmdObj.password,
            provider: "local",
            familyName: cmdObj.familyName,
            givenName: cmdObj.givenName,
            middleName: cmdObj.middleName,
            emails: [],
            photos: []
        };
        if (typeof cmdObj.email !== 'undefined') {
            topost.emails.push(cmdObj.email);
        }
        // 获取REST服务器的连接，然后对该URL发送POST请求，携带topost数据，在callback中处理结果
        client(program).post("/find-or-create", topost, (err, req, res, obj) => {
            if (err) {
                console.error(err.stack);
            } else {
                console.log("Found or Created " + util.inspect(obj));
            }
        })
    })

program.parse(process.argv);
