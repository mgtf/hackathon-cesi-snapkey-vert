const requestString = "https://immobilier.cbre.fr/ui/listpage/properties.aspx?";
const https = require('https');
var HTMLParser = require('node-html-parser');
const cheerio = require('cheerio');
const { Parser } = require('json2csv');
const fs = require('fs');
const cliProgress = require('cli-progress');

const PAGING = "10000"; // Le nombre d'items par page (pas important)
const PAGE = "0"; // Le numéro de page
const SORT = "0"; // Le paramètre de tri
const WPO = "0"; // Seulement des items avec prix (ici à FAUX)

const fields = ["type_de_transaction","type_de_bien","code_postal","prix_m2_an","surface"];
const opts = { keys: fields, delimiter : ";" };

var finalJson = {};
var isRequestOk = {};
var requestParameters = {};

const ZPTID = {
  "bureau" : 1,
  "commerce" : 5
};

const TT = {
  "vente" : 0,
  "location" : 1,
  "cession" : 3
};

//Requête de location/vente commerce/bureau
async function requestProperty(zptid, tt, zipCode){
  isRequestOk[requestString + constructGetParameters(zptid, tt, zipCode)] = false
  requestParameters[requestString + constructGetParameters(zptid, tt, zipCode)] = [zptid, tt, zipCode];
  return new Promise(function(resolve, reject) {
    https.get(requestString + constructGetParameters(zptid, tt, zipCode) , (resp) => {
      let url = "https://" + resp.socket._host + resp.socket.parser.outgoing.path;
      let data = '';
      let zptidTEMP = requestParameters[url][0];
      let ttTEMP = requestParameters[url][1];
      let zipCodeTEMP = requestParameters[url][2];

      // Une partie des données a été récupérée
      resp.on('data', (chunk) => {
        data += chunk;
      });

      // La réponse a été reçue en entière
      resp.on('end', () => {
        const $ = cheerio.load(data);
        var links = [];
        $("a").each(function(){
          if(this.attribs.href && this.attribs.href.indexOf('.aspx') > -1) links.push(this.attribs.href);
        })
        links = [...new Set(links)];
        isRequestOk[url] = true
            resolve(asyncForLoop(links, zptidTEMP, ttTEMP));
      });

    }).on("error", (err) => {
      console.log("Error: " + err.message);
    });
  });
}

function constructGetParameters(zptid, tt, zipCode){
  return "ZPTID=" + ZPTID[zptid.toLowerCase()] + "&TT=" + TT[tt.toLowerCase()] + "&Paging=" + PAGING + (zipCode ? ("&Search=" + zipCode) : "") + "&Page=" + PAGE + "&Sort=" + SORT + "&WPO=" + WPO + "&_=1582913933890"
}

// For loop avec des "await" pour ne pas saturer les requêtes. Risque de pendre un peu plus de temps, du coup.
async function asyncForLoop(array, typeDeBien, typeDeTransaction){
  return new Promise(function(resolve, reject) {
    var length = array.length
    const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    bar1.start(length, 0);
    if(length == 0) bar1.stop();
    for(var item of array){
      isRequestOk[item] = false;
      requestParameters[item] = [typeDeBien, typeDeTransaction];
      https.get(item, (resp) => {
        let url = "https://" + resp.socket._host + resp.socket.parser.outgoing.path;
        let ID = resp.socket.parser.outgoing.path.split('/')[resp.socket.parser.outgoing.path.split('/').length-1].split('.')[0]
        let data = '';

        // Une partie des données a été récupérée
        resp.on('data', (chunk) => {
          data += chunk;
        });

        // La réponse a été reçue en entière
        resp.on('end', () => {
          if(typeof data !== "string") return;
          if(data.indexOf("L'offre demandée n'est plus disponible.") > -1){
            bar1.increment();
            isRequestOk[url] = true;
            return;
          }
          const $ = cheerio.load(data);

          var zipCode = "";
          var surface = "";
          var price = 0;

          // Récupérons les données
          surface = $(".infos-more.row").find("p")[0].children[1].data;
          price = $(".infos-more.row").find("p")[1].children[2].data;
          zipCode = $(".infos").find("p")[0].children[0].data.split(' ');

          //Formattons-les
          for(var word of zipCode){
            if(/[0-9]{5}/.test(word)) {
              zipCode = word;
              break;
            }
          }
          if(Array.isArray(zipCode)){
            zipCode = null;
          }
          if(surface.indexOf(':') > -1 && surface.indexOf('m²') > -1) surface = surface.substring(surface.indexOf(':')+2, surface.indexOf('m²')-1).trim()
          else surface = null
          var stringPrice = price;
          if(price.indexOf(':') > -1 && price.indexOf('€') > -1) price = price.substring(price.indexOf(':')+2, price.indexOf('€')-1).trim().split(' ').join('')
          else price = null
          if(price && stringPrice.indexOf("m²/an") == -1 && stringPrice.indexOf('€') > -1){
            price = Math.floor(parseFloat(price)/parseFloat(surface));
          }
          // On l'intègre au JSON et on dit que la requête est finie
          finalJson[ID] = {type_de_transaction : requestParameters[url][1], type_de_bien : requestParameters[url][0], code_postal : zipCode, prix_m2_an: price, surface : surface}
          isRequestOk[url] = true;
          var arr = Object.keys(isRequestOk).map(function(k) { return isRequestOk[k] });
          bar1.increment();
          if(arr.filter(element => element == false).length == 0){
            //SI toutes les requêtes sont terminées, retourne la promesse
            resolve(finalJson)
            bar1.stop();
          }
        });

      }).on("error", (err) => {
        console.log("Error: " + err.message);
      });
    }
  });
}

function main(){
  requestProperty("bureau", "location").then(function(){
    requestProperty("commerce", "location").then(function(){
      requestProperty("commerce", "cession").then(function(){
        try{
          const parser = new Parser(opts);
          var jsonArray = Object.keys(finalJson).map(function(k) { return finalJson[k] });
          const csv = parser.parse(jsonArray);
          var universalBOM = "\uFEFF";
          fs.writeFile(__dirname + "/csv/vert.csv", universalBOM+csv, function(err) {
            if(err) {
              return console.log(err);
            }
            console.log("The file was saved!");
          });
        } catch (err) {
          console.error(err);
        }
      });
    });
  });
}

if(process.argv.length > 3){
  var zptid = process.argv[2];
  var tt = process.argv[3];
  var zipCode = process.argv[4];
  if(ZPTID[zptid] !== undefined && TT[tt] !== undefined && (zptid+tt !== "bureaucession")) {
    if(zipCode){
      requestProperty(zptid, tt, zipCode).then(function(){
        try{
          const parser = new Parser(opts);
          var jsonArray = Object.keys(finalJson).map(function(k) { return finalJson[k] });
          const csv = parser.parse(jsonArray);
          var universalBOM = "\uFEFF";
          fs.writeFile(__dirname + "/csv/" + zptid + "-" + tt + "-" + Math.round(new Date().getTime() / 1000) + ".csv", universalBOM+csv, function(err) {
            if(err) {
              return console.log(err);
            }
            console.log("The file was saved!");
          });
        } catch (err) {
          console.error(err);
        }
      });
    }else{
      requestProperty(zptid, tt).then(function(){
        try{
          const parser = new Parser(opts);
          var jsonArray = Object.keys(finalJson).map(function(k) { return finalJson[k] });
          const csv = parser.parse(jsonArray);
          var universalBOM = "\uFEFF";
          fs.writeFile(__dirname + "/csv/" + zptid + "-" + tt + "-" + Math.round(new Date().getTime() / 1000) + ".csv", universalBOM+csv, function(err) {
            if(err) {
              return console.log(err);
            }
            console.log("The file was saved!");
          });
        } catch (err) {
          console.error(err);
        }
      });
    }
  }else{
    console.log("Les combinaisons suivantes seulement sont acceptées : \n-'node index.js bureau location' \n-'node index.js bureau vente' \n-'node index.js commerce location' \n-'node index.js commerce vente'\n-'node index.js commerce cession'\nVous pouvez spécifier après cela le code postal.")
  }
}else if(process.argv.length > 2){
  console.log("Il faut préciser dans l'ordre le type de bien et ensuite le type de transaction. \nExemple : 'node index.js bureau location'")
}else{
  main();
}
