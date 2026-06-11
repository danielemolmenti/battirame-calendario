# Battirame online con backoffice protetto

Questa versione separa:

- calendario pubblico, visibile a tutti
- backoffice, accessibile solo con password

## Avvio locale

```bash
node server.js
```

Poi apri:

```text
http://localhost:3000
```

## Pubblicazione online

La password già impostata è:

```text
12345
```

Quando il sito viene pubblicato, è meglio cambiarla impostando sul servizio hosting questa variabile:

```text
BATTIRAME_ADMIN_PASSWORD
```

Il valore deve essere la nuova password scelta per chi gestisce il backoffice.

## Render

Su Render crea un nuovo Web Service.

Imposta questi valori:

```text
Root Directory: outputs
Build Command: npm install
Start Command: npm start
```

Se Render ti chiede la variabile della password, usa:

```text
BATTIRAME_ADMIN_PASSWORD = 12345
```

Quando Render finisce la pubblicazione, ti dà un indirizzo pubblico simile a:

```text
https://nome-del-sito.onrender.com
```

Quello sarà il link da condividere.

## Dati

Gli orari, le attività e i tecnici vengono salvati nel file:

```text
data.json
```

Il calendario pubblico legge gli stessi dati, mentre le modifiche sono accettate solo dopo il login.

## Backup

Nel backoffice trovi il pulsante:

```text
Scarica backup
```

Scarica un file con nome simile a:

```text
backup-battirame-2026-06-11.json
```

Quando il browser chiede dove salvarlo, puoi scegliere una cartella dentro Google Drive, iCloud Drive, Dropbox o una cartella qualsiasi del computer.

Per ripristinare un backup, usa:

```text
Carica backup
```

Scegli il file `.json` salvato in precedenza. Il contenuto del backoffice verrà sostituito con quello del backup.
