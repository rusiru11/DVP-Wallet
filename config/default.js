module.exports = {
    "DB": {
        "Type": "postgres",
        "User": "duouser",
        "Password": "DuoS123",
        "Port": 5432,
        "Host": "localhost",
        "Database": "dvpdb"
    },
    "Redis": {
        "ip": "45.55.142.207",
        "port": 6389,
        "password":"DuoS123",
        "redisdb":0,
        "ttl":30000
    },

    "Host": {
        "domain": "0.0.0.0",
        "port": 3333,
        "version": "1.0.0.0",
        "hostpath": "./config",
        "logfilepath": ""
    },
    "Security": {
        "ip" : "45.55.142.207",
        "port": 6389,
        "password":"DuoS123"
    },
    "RabbitMQ":
    {
        "ip": "45.55.142.207",
        "port": 5672,
        "user": "guest",
        "password": "guest"
    },

    "Services": {

        "limitServiceHost": "192.168.0.54",
        "limitServicePort": 8084,
        "limitServiceVersion": "6.0",
        "trunkServiceHost": "192.168.0.89",
        "trunkServicePort":9898 ,
        "trunkServiceVersion": "1.0.0.0",
        "voxboneUrl": "https://sandbox.voxbone.com/ws-voxbone/services/rest"

    }
};

