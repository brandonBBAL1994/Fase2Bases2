const express = require('express');
const app = express();
const router = express.Router();
const cors = require('cors');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const mongo = require('mongodb');
const API_PUERTO = 4203;


/* CONFIGURACIONES INICIALES */
const DB_NAME = 'proyecto_clase'
const CONNECTION_STRING_MONGO = `mongodb+srv://bredly:bredlybd2@clusterdb.0ts2t.mongodb.net/${DB_NAME}?retryWrites=true&w=majority`
const COLLECTION_PARTIDOS = "partidos";

let MongoClient = mongo.MongoClient;
let mongoDB;

const setArray = (arrayEquipos, equipo, goles) => {
    if(arrayEquipos.filter(team => equipo === team.nombre).length == 0){
        arrayEquipos.push({nombre: equipo, total_goles: goles})
    }else{
        arrayEquipos.filter(team => equipo === team.nombre)[0].total_goles += goles
    }
}

router.get('/golesPorTemporada', jsonParser, function (req, res) {

    let arrayFinal = []
    let arrayTeam = []

    mongoDB.db(DB_NAME).collection(COLLECTION_PARTIDOS).find({}).toArray((error, result) => {
        if(error) return null
        for(let i = 0; i < result.length; i++){
            let temporada = result[i].temporada
            let golesPorTemporada = 0        
            let jornadas = result[i].jornadas

            for(let j = 0; j < jornadas.length; j++){
                let partidos = jornadas[j].partidos
                let golesJornada = 0
                for(let z = 0; z < partidos.length; z++){
                    let juego = partidos[z]
                    golesJornada += juego.gol_local + juego.gol_visita
                    setArray(arrayTeam, juego.local, juego.gol_local)
                    setArray(arrayTeam, juego.visita, juego.gol_visita)
                }
                golesPorTemporada += golesJornada
            }
            
            arrayTeam.sort(function(a,b) {
                return b.total_goles - a.total_goles
            })

            const equipoMayor = {nombre: arrayTeam[0].nombre, total: arrayTeam[0].total_goles}
            const equipoMenor = {nombre: arrayTeam[arrayTeam.length-1].nombre, total: arrayTeam[arrayTeam.length-1].total_goles }

            arrayFinal.push({temporada: temporada, 
                             total_goles: golesPorTemporada, 
                             mayor: equipoMayor.nombre, goles_mayor: equipoMayor.total, 
                             menor: equipoMenor.nombre, goles_menor: equipoMenor.total})
            golesPorTemporada = 0
            arrayTeam = []
        }

        //mongoDB.close()
        res.send({data: arrayFinal})
    })
});


router.get('/consultaK', jsonParser, function(req, res){

    mongoDB.db(DB_NAME).collection(COLLECTION_PARTIDOS).find({}).toArray((error, result) => {
        if(error) return null
        let arrayTeam = []

        for(let i = 0; i < result.length; i++){
            let jornadas = result[i].jornadas
            for(let j = 0; j < jornadas.length; j++){
                let partidos = jornadas[j].partidos
                for(let z = 0; z < partidos.length; z++){
                    let juego = partidos[z]
                    setArrayQueryK(arrayTeam, juego.local, juego.visita, juego.gol_local, juego.gol_visita)
                }
            }
        }

        arrayTeam.sort(function(a,b) {
            return b.ganados - a.ganados
        })

        const mayorGanados = {nombre: arrayTeam[0].nombre, ganados: arrayTeam[0].ganados}

        arrayTeam.sort(function(a,b) {
            return b.perdidos - a.perdidos
        })

        const mayorPerdidos = {nombre: arrayTeam[0].nombre, perdidos: arrayTeam[0].perdidos}

        arrayTeam.sort(function(a,b) {
            return b.empates - a.empates
        })

        const mayorEmpates = {nombre: arrayTeam[0].nombre, empates: arrayTeam[0].empates}

        const salida = { ganados: mayorGanados, perdidos: mayorPerdidos, empates: mayorEmpates }
        
        //mongoDB.close()
        res.send({data: salida})
    })
})

const setArrayQueryK = (arrayTeam, local, visita, gol_local, gol_visita) => {
    if(arrayTeam.filter(team => local === team.nombre).length === 0){
        arrayTeam.push({nombre: local, ganados: 0, perdidos: 0, empates: 0 })
    }
    if(arrayTeam.filter(team => visita === team.nombre).length === 0){
        arrayTeam.push({nombre: visita, ganados: 0, perdidos: 0, empates: 0})
    }

    if(gol_local === gol_visita){//empate
        arrayTeam.filter(team => local === team.nombre)[0].empates += 1
        arrayTeam.filter(team => visita === team.nombre)[0].empates += 1
    }else if(gol_local > gol_visita){
        arrayTeam.filter(team => local === team.nombre)[0].ganados += 1
        arrayTeam.filter(team => visita === team.nombre)[0].perdidos += 1
    }else{
        arrayTeam.filter(team => local === team.nombre)[0].perdidos += 1
        arrayTeam.filter(team => visita === team.nombre)[0].ganados += 1
    }



}


router.get('/victoriaMasAbultada', jsonParser, function(req, res) {

    mongoDB.db(DB_NAME).collection(COLLECTION_PARTIDOS).find({}).toArray((error, result) => {
        if(error) return null
        let arrayTeam = []

        for(let i = 0; i < result.length; i++){
            let jornadas = result[i].jornadas
            for(let j = 0; j < jornadas.length; j++){
                let partidos = jornadas[j].partidos
                for(let z = 0; z < partidos.length; z++){
                    let juego = partidos[z]
                    setArrayQueryG(arrayTeam, juego.local, juego.visita, juego.gol_local, juego.gol_visita, result[i].temporada)
                }
            }
        }
        //mongoDB.close()
        res.send({data: arrayTeam})
    })
})


const setArrayQueryG = (arrayTeam, local, visita, gol_local, gol_visita, temporada) => {

    if(arrayTeam.length !== 0){
        if(gol_local !== gol_visita){//hubo un ganador
            let tmp = arrayTeam[0]

            let diferenciaTmp = tmp.goles_ganador - tmp.goles_perdedor
            let diferenciaActual = 0

            if(gol_local > gol_visita){//el local gano
                diferenciaActual = gol_local - gol_visita
            }else{//la visita gano
                diferenciaActual = gol_visita - gol_local
            }

            if(diferenciaActual > diferenciaTmp){//SI HUBO UN PARTIDO CON MAS DIFERENCIA DE GOLES
                if(gol_local > gol_visita){
                    arrayTeam[0].ganador = local
                    arrayTeam[0].goles_ganador = gol_local
                    arrayTeam[0].perdedor = visita
                    arrayTeam[0].goles_perdedor = gol_visita
                }else{
                    arrayTeam[0].ganador = visita
                    arrayTeam[0].goles_ganador = gol_visita
                    arrayTeam[0].perdedor = local
                    arrayTeam[0].goles_perdedor = gol_local
                }
                arrayTeam[0].temporada = temporada
            }

        }
    }else{
        if(gol_local !== gol_visita){//hubo un ganador
            if(gol_local > gol_visita){//gano local
                arrayTeam.push({ganador: local, goles_ganador: gol_local, perdedor: visita, goles_perdedor: gol_visita, temporada: temporada})
            }else{//gano visita
                arrayTeam.push({ganador: visita, goles_ganador: gol_visita, perdedor: local, goles_perdedor: gol_local, temporada: temporada})
            }
        }
    }

}


router.post('/E/victimaFavorita', jsonParser, function(req, res){

    const query = ({$or: [{"jornadas.partidos.local": req.body.nombre}, {"jornadas.partidos.visita": req.body.nombre}]}, {"jornadas.partidos.$": 1})

    mongoDB.db(DB_NAME).collection(COLLECTION_PARTIDOS).find({}).toArray((error, result) => {
        if(error) return null
        let arrayTeam = []

        for(let i = 0; i < result.length; i++){
            let jornadas = result[i].jornadas
            for(let j = 0; j < jornadas.length; j++){
                let partidos = jornadas[j].partidos
                for(let z = 0; z < partidos.length; z++){
                    let juego = partidos[z]
                    if(juego.local !== req.body.nombre && juego.visita !== req.body.nombre ) continue
                    if(juego.gol_local === juego.gol_visita) continue
                    setArrayQueryE(arrayTeam, juego.local, juego.visita, juego.gol_local, juego.gol_visita, req.body.nombre)
                }
            }
        }

        arrayTeam.sort(function(a,b) {
            return b.total - a.total
        })

        const victimaPreferida = {ganador: arrayTeam[0].ganador, perdedor: arrayTeam[0].perdedor, vencidas: arrayTeam[0].total}

        //mongoDB.close()
        res.send({data: victimaPreferida})
    })
})


const setArrayQueryE = (arrayTeam, local, visita, gol_local, gol_visita, buscado) => {

    if(arrayTeam.length !== 0){
        if(gol_local > gol_visita){
            if(local === buscado){
                if(arrayTeam.filter(resultado => (resultado.ganador === local && resultado.perdedor === visita)).length === 0){
                    arrayTeam.push({ganador: local, perdedor: visita, total: 1})
                }else{
                    arrayTeam.filter(resultado => (resultado.ganador === local && resultado.perdedor === visita))[0].total += 1
                }
            }
        }else{
            if(visita === buscado){
                if(arrayTeam.filter(resultado => (resultado.ganador === visita && resultado.perdedor === local)).length === 0){
                    arrayTeam.push({ganador: visita, perdedor: local, total: 1})
                }else{
                    arrayTeam.filter(resultado => (resultado.ganador === visita && resultado.perdedor === local))[0].total += 1
                } 
            }
        }
    }else{
        if(gol_local > gol_visita){
            if(local === buscado){
                arrayTeam.push({ganador: local, perdedor: visita, total: 1})
            }
        }else{
            if(visita === buscado){
                arrayTeam.push({ganador: visita, perdedor: local, total: 1})
            }
        }
    }
}


app.use("/api", router);
app.use(cors());

MongoClient.connect(CONNECTION_STRING_MONGO, { useUnifiedTopology: true }, function (err, database) {
    if (err) throw err;
    mongoDB = database;
    app.listen(API_PUERTO, () => {
        console.log('API BASES2 corriendo en puerto ' + API_PUERTO);
    })
});
