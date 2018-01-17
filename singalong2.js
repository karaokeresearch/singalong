const express = require('express')
const app = express()



app.use(express.static(__dirname + '/static2')); //Where the static files are loaded from
app.use("/songs", express.static(__dirname + '/songs')); //Where the static files are loaded from

app.listen(8080, () => console.log('Singalong listening on port 8080.'))


