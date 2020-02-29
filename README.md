# Hackathon CESI x SNAPKEY, Équipe verte

## Installation

### Installer le script

Cloner le git et lancer un `$ npm install` pour être sûr d'avoir tous les modules

### Pour lancer

- Pour lancer le script, `$ node index.js`

## Paramètres

Le script est automatisé pour rechercher automatiquement tout (dans la fonction `main`) lorsqu'on ne spécifie pas d'arguments, mais il est possible d'en ajouter pour rechercher uniquement certains paramètres.
Les combinaisons suivantes seulement sont acceptées : 

- `$ node index.js`
Cherche sans aucun paramètre tous les types de biens et tous les types de transaction. DANGEREUX. RISSQUE DE CRASH.
- `$ node index.js bureau location`
- `$ node index.js bureau vente`
- `$ node index.js commerce location` 
- `$ node index.js commerce vente`
- `$ node index.js commerce cession`

Il est possible de spécifier un code postal.

- `$ node index.js commerce cession 75000`

### Paramètres de recherche secondaires

Normalement, les paramètres ont des commentaires pour que vous puissiez les repérer.

```js
const PAGING = "10000"; // Le nombre d'items par page (garder HAUT)
const PAGE = "0"; // Le numéro de page (pas important)
const SORT = "0"; // Le paramètre de tri (pas important)
const WPO = "0"; // Seulement des items avec prix (ici à FAUX)
```

Les constantes PAGE et SORT ne sont pas importantes car :
- Le nombre de page sera normalement toujours à 0 si l'on garde un nombre d'item par page haut.
- Le SORT n'impacte pas le scraping, et comme on a recourt à des méthodes asynchrones, le JSON ne sera pas dans le même ordre.

### Fonctionnement

La fonction va construire un string de recherche en fonction des arguments entrés. S'il n'y a aucun argument, elle fera la recherche pour tous les arguments en simultané. (Dangereux, risque de crash)
```js
const ZPTID = {
  "bureau" : 1,
  "commerce" : 5
};

const TT = {
  "vente" : 0,
  "location" : 1,
  "cession" : 3
};

async function requestProperty(zptid, tt, zipCode)
```

Il y aura ensuite avec cette recherche un tas d'autres requêtes qui iront chercher les informations requises des biens.


### Fonctionnement de la requête

La fonction renvoie une PROMISE (donc du code asynchrone), il faut donc la récupérer avec un "then" ou imbriquer l'appel de la fonction dans une fonction asynchrone. Cette promise renvoie ensuite un JSON.

#### Exemples :

- Récupération asynchrone :
```js
requestProperty("bureau", "vente", "75").then(function(json){
	// Votre code
})
```
- En forçant le synchrone :
```js
async function main(){
	var json = await requestProperty("bureau", "vente", "75");
}
main();
```

Pour chaque requête faite, il y a une barre de chargement qui sera affichée. Si par exemple vous faites trois requêtes imbriquées :
```js
requestProperty("bureau", "location").then(function() {
    requestProperty("commerce", "location").then(function() {
        requestProperty("commerce", "cession").then(function() {
            try {
                const parser = new Parser(opts);
                var jsonArray = Object.keys(finalJson).map(function(k) {
                    return finalJson[k]
                });
                const csv = parser.parse(jsonArray);
                var universalBOM = "\uFEFF";
                fs.writeFile(__dirname + "/csv/vert.csv", universalBOM + csv, function(err) {
                    if (err) {
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
```

Cela vous affichera trois barres :

```js
 ████████████████████████████████████████ 100% | ETA: 0s | 313/313
 ████████████████████████████████████████ 100% | ETA: 0s | 5/5
 ███████████████████████████████████░░░░░ 87.5% | ETA: 0s | 5/5
```

Le ficher sera sauvegardé dans le dossier `csv`

## TODO

- Traduire les phrases en français
- **DEBUGGING**