// Archivio parole. Formato: "Parola|Indizio per l'impostore".
// L'indizio deve essere collegato alla parola ma di lato: niente sinonimi, niente cose impossibili.
const CATEGORIES = [
  {
    id: 'cibo', name: 'Cibo & Cucina', icon: '🍝', words: [
      'Lasagna|Strati', 'Pesto|Mortaio', 'Tiramisù|Caffè', 'Sushi|Bacchette', 'Carbonara|Roma',
      'Pizza margherita|Napoli', 'Risotto|Mantecare', 'Polenta|Paiolo', 'Arancino|Sicilia', 'Gelato|Cono',
      'Fonduta|Svizzera', 'Hamburger|Griglia', 'Kebab|Notte', 'Croissant|Colazione', 'Nutella|Barattolo',
      'Popcorn|Cinema', 'Ramen|Brodo', 'Tacos|Messico', 'Paella|Zafferano', 'Bruschetta|Aglio',
      'Cannolo|Ricotta', 'Panettone|Milano', 'Ostrica|Perla', 'Cioccolata calda|Inverno', 'Pancake|Sciroppo',
      'Tartufo|Cane', 'Zucchero filato|Luna park', 'Birra|Luppolo', 'Spritz|Aperitivo', 'Caffè espresso|Tazzina',
      'Cacio e pepe|Pecorino', 'Mozzarella|Bufala', 'Patatine fritte|Olio', 'Maionese|Uovo', 'Uova strapazzate|Padella',
    ],
  },
  {
    id: 'luoghi', name: 'Luoghi', icon: '📍', words: [
      'Ospedale|Attesa', 'Biblioteca|Silenzio', 'Aeroporto|Valigia', 'Spiaggia|Asciugamano', 'Cimitero|Fiori',
      'Museo|Guida', 'Discoteca|Buttafuori', 'Palestra|Sudore', 'Supermercato|Carrello', 'Stazione|Ritardo',
      'Chiesa|Campane', 'Prigione|Sbarre', 'Zoo|Recinto', 'Luna park|Urla', 'Cinema|Buio',
      'Farmacia|Croce', 'Ascensore|Piani', 'Sottomarino|Periscopio', 'Castello|Fossato', 'Faro|Scogliera',
      'Rifugio di montagna|Sentiero', 'Casinò|Fiches', 'Studio del dentista|Trapano', 'Autolavaggio|Spazzole',
      'Stazione spaziale|Gravità', 'Hotel|Reception', 'Banca|Cassaforte', 'Ufficio postale|Fila',
      'Scuola|Campanella', 'Mercato del pesce|Odore', 'Camper|Viaggio', 'Piscina|Cuffia', 'Stadio|Coro',
    ],
  },
  {
    id: 'oggetti', name: 'Oggetti di casa', icon: '🛋️', words: [
      'Ombrello|Stecche', 'Frigorifero|Calamite', 'Lavatrice|Calzino', 'Specchio|Mattina', 'Candela|Blackout',
      'Spazzolino|Setole', 'Telecomando|Divano', 'Forbici|Carta', 'Cuscino|Piume', 'Orologio|Lancette',
      'Chiavi|Tasca', 'Asciugacapelli|Aria calda', 'Ferro da stiro|Pieghe', 'Tostapane|Fette', 'Aspirapolvere|Rumore',
      'Ventilatore|Estate', 'Accendino|Scintilla', 'Scopa|Strega', 'Zerbino|Ingresso', 'Caricabatterie|Presa',
      'Termosifone|Valvola', 'Comodino|Letto', 'Cavatappi|Vino', 'Grattugia|Parmigiano', 'Moka|Fornello',
      'Mollette|Stendino', 'Tappeto|Polvere', 'Lampadina|Idea', 'Sveglia|Lunedì', 'Tenda della doccia|Psycho',
      'Portafoglio|Scontrini',
    ],
  },
  {
    id: 'animali', name: 'Animali', icon: '🦒', words: [
      'Pinguino|Smoking', 'Giraffa|Altezza', 'Camaleonte|Colori', 'Polpo|Inchiostro', 'Koala|Eucalipto',
      'Gufo|Saggezza', 'Pavone|Vanità', 'Formica|Colonia', 'Delfino|Sonar', 'Bradipo|Ramo',
      'Zanzara|Prurito', 'Elefante|Memoria', 'Panda|Bambù', 'Struzzo|Sabbia', 'Squalo|Pinna',
      'Ape|Regina', 'Lumaca|Guscio', 'Pipistrello|Grotta', 'Fenicottero|Rosa', 'Riccio|Spine',
      'Canguro|Tasca', 'Cammello|Deserto', 'Gatto|Fusa', 'Cane|Guinzaglio', 'Piccione|Piazza',
      'Medusa|Bruciore', 'Unicorno|Arcobaleno', 'Lupo|Luna', 'Cavalluccio marino|Papà', 'Scoiattolo|Ghianda',
    ],
  },
  {
    id: 'lavori', name: 'Mestieri', icon: '🔧', words: [
      'Chirurgo|Bisturi', 'Pompiere|Scala', 'Astronauta|Orbita', 'Barista|Schiuma', 'Avvocato|Arringa',
      'Poliziotto|Distintivo', 'Pilota d\'aereo|Cabina', 'Insegnante|Registro', 'Idraulico|Perdita',
      'Parrucchiere|Pettegolezzi', 'Chef|Brigata', 'Dentista|Carie', 'Giardiniere|Siepe', 'Mago|Cilindro',
      'Clown|Naso', 'Postino|Campanello', 'Influencer|Sponsor', 'Muratore|Cazzuola', 'Bagnino|Fischietto',
      'Tassista|Tassametro', 'Veterinario|Zampa', 'Fotografo|Obiettivo', 'DJ|Consolle', 'Giornalista|Scoop',
      'Detective|Lente', 'Archeologo|Scavi', 'Benzinaio|Pompa', 'Meteorologo|Nuvole', 'Sommelier|Annusare',
      'Youtuber|Iscriviti',
    ],
  },
  {
    id: 'sport', name: 'Sport & Tempo libero', icon: '⚽', words: [
      'Calcio|Fuorigioco', 'Tennis|Set', 'Sci|Seggiovia', 'Nuoto|Vasca', 'Boxe|Guantoni',
      'Scacchi|Arrocco', 'Golf|Buca', 'Formula 1|Pit stop', 'Pallavolo|Schiacciata', 'Basket|Tripla',
      'Surf|Onda', 'Ciclismo|Maglia rosa', 'Equitazione|Sella', 'Bowling|Strike', 'Pesca|Esca',
      'Karate|Cintura', 'Yoga|Tappetino', 'Paracadutismo|Aereo', 'Arrampicata|Moschettone', 'Maratona|Chilometri',
      'Freccette|Bersaglio', 'Ping pong|Pallina', 'Rugby|Mischia', 'Scherma|Maschera', 'Pattinaggio su ghiaccio|Piroetta',
      'Videogiochi|Controller', 'Karaoke|Stonato', 'Puzzle|Pezzi', 'Monopoli|Prigione', 'Campeggio|Tenda',
    ],
  },
  {
    id: 'film', name: 'Film, Serie & Cartoni', icon: '🎬', words: [
      'Harry Potter|Cicatrice', 'Il Re Leone|Savana', 'Titanic|Iceberg', 'Star Wars|Padre', 'Shrek|Palude',
      'Squid Game|Tuta', 'La casa di carta|Maschera', 'Il Signore degli Anelli|Vulcano', 'Frozen|Sorelle',
      'Toy Story|Cowboy', 'I Simpson|Giallo', 'Stranger Things|Sottosopra', 'Jurassic Park|Zanzara',
      'Spider-Man|Zio', 'Batman|Maggiordomo', 'Pinocchio|Bugia', 'Il Padrino|Offerta', 'Breaking Bad|Camper',
      'Peppa Pig|Pozzanghera', 'Pokémon|Allenatore', 'Ritorno al futuro|Orologio', 'Matrix|Pillola',
      'Fantozzi|Nuvola', 'Up|Palloncini', 'Ratatouille|Cappello', 'Lo squalo|Musica', 'Il Trono di Spade|Inverno',
      'Gomorra|Faida', 'Forrest Gump|Cioccolatini', 'Mr. Bean|Orsacchiotto', 'Mare fuori|Carcere',
    ],
  },
  {
    id: 'famosi', name: 'Personaggi famosi', icon: '⭐', words: [
      'Albert Einstein|Lingua', 'Leonardo da Vinci|Sorriso', 'Napoleone|Mano', 'Cristoforo Colombo|Uovo',
      'Dante Alighieri|Selva', 'Elon Musk|Razzi', 'Michael Jackson|Guanto', 'Cleopatra|Serpente', 'Francesco Totti|Cucchiaio',
      'Valentino Rossi|Dottore', 'Babbo Natale|Camino', 'Marilyn Monroe|Vento', 'Galileo Galilei|Cannocchiale',
      'Mozart|Parrucca', 'Garibaldi|Camicia', 'Shakespeare|Teschio', 'Steve Jobs|Dolcevita', 'Freddie Mercury|Baffi',
      'Super Mario|Funghi', 'Sherlock Holmes|Pipa', 'Dracula|Aglio', 'Cenerentola|Mezzanotte', 'Lionel Messi|Pulce',
      'Lady Gaga|Bistecca', 'Il Papa|Balcone', 'Gandhi|Sale', 'Pitagora|Tabelline', 'Marco Polo|Milione',
      'Jannik Sinner|Carote', 'Vasco Rossi|Rocker',
    ],
  },
  {
    id: 'tech', name: 'Tecnologia & Internet', icon: '📱', words: [
      'WhatsApp|Spunte', 'TikTok|Balletto', 'Wi-Fi|Password', 'Bitcoin|Miniera', 'Intelligenza artificiale|Prompt',
      'Instagram|Filtro', 'Netflix|Abbonamento', 'Emoji|Faccine', 'Password|Asterischi', 'Selfie|Bastone',
      'GPS|Ricalcolo', 'Captcha|Semafori', 'Meme|Template', 'YouTube|Pubblicità', 'Bluetooth|Accoppiare',
      'Screenshot|Prova', 'Spam|Principe nigeriano', 'Hacker|Cappuccio', 'Podcast|Microfono', 'Batteria scarica|1%',
      'Videochiamata|Muto', 'Google Maps|Omino', 'Fortnite|Tempesta', 'Minecraft|Blocchi', 'Twitch|Donazioni',
      'Smartwatch|Polso', 'Stampante|Inceppata', 'Aggiornamento|Riavvio', 'Cloud|Backup', 'Dark mode|Occhi',
    ],
  },
  {
    id: 'scienza', name: 'Scienza & Natura', icon: '🔬', words: [
      'Vulcano|Pompei', 'Arcobaleno|Prisma', 'Buco nero|Orizzonte', 'DNA|Elica', 'Fulmine|Temporale',
      'Eclissi|Ombra', 'Terremoto|Scala', 'Gravità|Mela', 'Dinosauro|Fossile', 'Tsunami|Onda',
      'Ghiacciaio|Scioglimento', 'Aurora boreale|Norvegia', 'Magnete|Polo', 'Cometa|Coda', 'Microscopio|Vetrino',
      'Fotosintesi|Clorofilla', 'Vaccino|Ago', 'Batterio|Antibiotico', 'Atomo|Nucleo', 'Deserto|Miraggio',
      'Foresta amazzonica|Polmone', 'Luna|Maree', 'Big Bang|Inizio', 'Marte|Rover', 'Diamante|Carbonio',
      'Cervello|Neuroni', 'Sole|Lentiggini', 'Barriera corallina|Pesci pagliaccio', 'Ossigeno|Bombola', 'Uragano|Occhio',
    ],
  },
  {
    id: 'storia', name: 'Storia & Mitologia', icon: '🏛️', words: [
      'Piramidi|Faraone', 'Colosseo|Gladiatori', 'Vichinghi|Drakkar', 'Muro di Berlino|1989', 'Cavallo di Troia|Regalo',
      'Zeus|Olimpo', 'Ercole|Fatiche', 'Atlantide|Sommersa', 'Samurai|Onore', 'Re Artù|Roccia',
      'Rivoluzione francese|Brioche', 'Allunaggio|Bandiera', 'Spartani|Scudo', 'Ninja|Stelle', 'Pirati|Benda',
      'Mummia|Sarcofago', 'Stonehenge|Pietre', 'Inquisizione|Rogo', 'Muraglia cinese|Spazio', 'Giulio Cesare|Idi',
      'Odissea|Sirene', 'Minotauro|Labirinto', 'Santo Graal|Coppa', 'Cowboy|Saloon', 'Sbarco in Normandia|Spiaggia',
      'Rinascimento|Firenze', 'Età della pietra|Clava', 'Impero romano|Legioni', 'Medusa (mito)|Statue', 'Titanic (nave)|Orchestra',
    ],
  },
  {
    id: 'viaggi', name: 'Viaggi & Vacanze', icon: '✈️', words: [
      'Passaporto|Timbro', 'Crociera|Buffet', 'Valigia|Cerniera', 'Jet lag|Fuso', 'Parigi|Baguette',
      'New York|Taxi gialli', 'Venezia|Acqua alta', 'Safari|Jeep', 'Ostello|Letto a castello', 'Autostop|Pollice',
      'Interrail|Zaino', 'Spa|Accappatoio', 'Souvenir|Calamita', 'Volo low cost|Bagaglio a mano', 'Montagna|Baita',
      'Maldive|Palafitte', 'Tokyo|Neon', 'Londra|Pioggia', 'Amsterdam|Biciclette', 'Las Vegas|Matrimonio',
      'Egitto|Cammello', 'Islanda|Geyser', 'Road trip|Playlist', 'Check-in|Coda', 'Mappa del tesoro|X',
      'Crema solare|Scottatura', 'Cartolina|Francobollo', 'Guida turistica|Ombrellino', 'Duty free|Profumo',
    ],
  },
  {
    id: 'nonna', name: 'Cose da nonna', icon: '👵', funny: true, words: [
      'Centrino|Uncinetto', 'Caramelle alla menta|Borsetta', '"Hai mangiato?"|Ancora', 'Ragù della domenica|Pentola',
      'Rosario|Grani', 'Pantofola volante|Lancio', 'Telenovela|Pomeriggio', 'Divano col cellophane|Plastica',
      'Busta delle buste|Cassetto', 'Scatola di biscotti col cucito dentro|Delusione', 'Dentiera|Bicchiere',
      'Occhiali sulla testa|Cercare', 'Ferri da maglia|Gomitolo', 'Mancia di 5 euro|"Non dirlo a mamma"',
      'Santino nel portafoglio|Protezione', 'Radio Maria|Frequenza', 'Messa in piega|Lacca', 'Tombola|Natale',
      'Brodino|Febbre', 'Vestaglia a fiori|Mattina', '"Sei dimagrito"|Preoccupazione', 'Calendario di Padre Pio|Cucina',
      'Bicarbonato|Rimedio', 'Tupperware|Avanzi', 'Fazzoletto di stoffa|Taschino', 'Mercato rionale|Sporta',
      'Pensione|Posta', 'Mal di schiena che prevede la pioggia|Meteo', 'Foto dei nipoti in cornice|Comò',
    ],
  },
  {
    id: 'imbarazzo', name: 'Momenti imbarazzanti', icon: '😳', funny: true, words: [
      'Salutare uno che salutava un altro|Braccio', 'Inciampare in pubblico|Marciapiede', 'Messaggio nel gruppo sbagliato|Panico',
      'Chiamare la prof "mamma"|Lapsus', 'Insalata tra i denti|Sorriso', 'Cerniera aperta|Pantaloni',
      'Tirare una porta con scritto "spingere"|Vetro', 'Ridere a un funerale|Serietà', 'Pancia che brontola in silenzio|Fame',
      'Mettere like a una foto vecchia|Stalking', 'Microfono acceso in call|Riunione', 'Dimenticare il nome di qualcuno|Presentazioni',
      'Bacio sulla guancia sbagliata|Collisione', 'Scivolare sul bagnato|Pavimento', 'Carta igienica sotto la scarpa|Bagno',
      'Cantare con le cuffie sull\'autobus|Volume', 'Carta rifiutata alla cassa|Cassiera', 'Rispondere "anche a lei" al cameriere|Ristorante',
      'Allarme del negozio che suona|Uscita', 'Starnuto durante un esame|Aula', 'Autocorrettore traditore|Tastiera',
      'Sedia che scricchiola|Peso', 'Sbagliare piano in ascensore|Bottone', 'Farsi trovare a parlare da soli|Specchio',
    ],
  },
  {
    id: 'notte', name: 'Le 3 di notte', icon: '🌙', funny: true, words: [
      'Frigo aperto al buio|Luce', 'Scrolling infinito|Pollice', 'Pensieri esistenziali|Soffitto',
      'Ricordare una figuraccia del 2014|Cuscino', 'Ordinare cose inutili online|Pacco', 'Scrivere all\'ex|Rimpianto',
      'Kebab dopo la serata|Cipolla', 'Rumore strano in casa|Coraggio', 'Zanzara nell\'orecchio|Ronzio',
      'Fame improvvisa|Biscotti', 'Tunnel di Wikipedia|Link', 'Insonnia|Pecore', 'Video di gattini|Algoritmo',
      '"Ancora una partita"|Alba', '"Sei sveglio?"|Spunta', 'Bere dal rubinetto|Sete', 'Telefono che cade in faccia|Naso',
      'Taxi dopo la discoteca|Tariffa', 'Ripasso dell\'ultimo minuto|Evidenziatore', 'Un\'intera serie in una notte|Episodio',
      'Cercare i sintomi su Google|Ipocondria', 'Fischio nelle orecchie dopo la discoteca|Casse', 'Gatto che corre per casa|Zampe',
    ],
  },
  {
    id: 'redflag', name: 'Red flag', icon: '🚩', funny: true, words: [
      'Ex ancora nella foto profilo|Ricordo', 'Occhiali da sole al chiuso|Mistero', 'Risponde solo "ok."|Punto',
      'Ti controlla il telefono|Password', 'Non mangia la pizza|Sospetto', 'Panna nella carbonara|Sacrilegio',
      '"Io non sono come gli altri"|Cliché', 'Visualizza e non risponde|Spunte', 'La mamma gli fa ancora il bucato|Cordone',
      'Si taglia le unghie a tavola|Schegge', 'Ha tre ex "pazze"|Pattern', 'Divide il conto al centesimo|Calcolatrice',
      'Ananas sulla pizza|Hawaii', 'Like alle 4 di notte|Insonnia', 'Parla solo delle sue crypto|Investimento',
      'Non chiede mai come stai|Ego', 'Il tuo cane non lo sopporta|Ringhio', 'Parla dell\'ex al primo appuntamento|Fantasma',
      '"Ti scrivo dopo"|Mai', 'Gelato con la forchetta|Posate', 'Al primo appuntamento porta sua madre|Terzo incomodo',
      'Applaude quando atterra l\'aereo|Pista',
    ],
  },
  {
    id: 'scuse', name: 'Scuse epiche', icon: '🙈', funny: true, words: [
      'Il cane ha mangiato i compiti|Quaderno', 'Il treno era in ritardo|Binario', 'Non ho visto il messaggio|Notifiche',
      'Ho il telefono scarico|Batteria', 'È morta la nonna (per la terza volta)|Funerale', 'Stavo proprio per scriverti|Telepatia',
      'C\'era traffico|Clacson', 'Non ho sentito la sveglia|Sonno', 'È colpa del Wi-Fi|Router', 'Ho la febbre|Termometro',
      'Ho già un impegno|Agenda', 'Non è come sembra|Flagrante', 'Era una battuta|Offesa', 'Me l\'avevi detto tu|Colpa',
      'Lo faccio domani|Rimandare', 'Ero in galleria|Linea', 'Sono al verde|Spiccioli', 'Sono a dieta|Insalata',
      'Mi si è perso il navigatore|Svolta', 'Ho mal di testa|Aspirina', 'L\'ho trovato già così|Rotto',
      'Sto arrivando|Doccia', 'Mi sono addormentato|Palpebre',
    ],
  },
  {
    id: 'italiani', name: 'Cose molto italiane', icon: '🍕', funny: true, words: [
      'Gesto "ma che vuoi"|Dita', 'Festival di Sanremo|Febbraio', 'Pranzo della domenica|Parenti',
      'Pensionato davanti al cantiere|Mani dietro la schiena', 'Calzini con i sandali|Turista', 'Mammone|Trentenne',
      'Bidet|Stupore degli stranieri', 'Parcheggio in doppia fila|Quattro frecce', 'Fantacalcio|Asta', 'Ferragosto|Grigliata',
      'Mamma che dice "copriti"|Maglia', 'Cappuccino dopo pranzo|Mezzogiorno', 'Sciopero dei treni|Venerdì',
      'Discussioni al bar sullo sport|Moviola', 'Gratta e vinci|Moneta', 'Vespa|Vacanze romane', 'Spezzare gli spaghetti|Urlo',
      'Prima comunione|Bomboniere', 'Cenone di Natale|Pancia', 'Burocrazia|Modulo', 'Scaramanzia|Corno',
      'Pandoro contro panettone|Dilemma', 'Zio che chiede "e la fidanzatina?"|Cena', 'Codice fiscale|Tessera',
      'Schedina|Bar', 'Colpo della strega|Corrente',
    ],
  },
  {
    id: 'uni', name: 'Vita da universitario', icon: '🎓', funny: true, words: [
      'Sessione d\'esame|Gennaio', 'Pacco da casa del fuorisede|Treno', 'Aula studio|Prese', 'Tesi di laurea|Relatore',
      'Erasmus|Scambio', 'Mensa|Vassoio', 'Appunti di un altro|Fotocopie', 'Lezione alle 8|Caffè',
      'Prof che non risponde alle mail|Attesa', 'Esame orale|Ansia', 'Bocciatura|Libretto', 'Proclamazione|Alloro',
      'Turni delle pulizie col coinquilino|Lavagnetta', 'Affitto in nero|Padrone di casa', 'Studio di gruppo|Chiacchiere',
      'Crediti formativi|Contatore', 'Festa di laurea|Papiro', 'Pasta al tonno|Fine mese', 'Iscrizione agli esami che crasha|Click day',
      'Slide del prof|PDF', 'Fila in segreteria|Sportello', 'Fuoricorso|Anni', 'Il 18 accettato|Rassegnazione',
      'Il 30 e lode|Media', 'Gruppo WhatsApp del corso|Silenzioso',
    ],
  },
  {
    id: 'genova', name: 'Genova & Liguria', icon: '⚓', funny: true, words: [
      'Focaccia al formaggio|Recco', 'Trofie al pesto|Fagiolini', 'Lanterna|Simbolo', 'Acquario|Delfini',
      'Boccadasse|Barche colorate', 'Caruggi|Vicoli', 'Sampdoria|Blucerchiati', 'Genoa|Grifone', 'Funicolare|Salita',
      'Farinata|Ceci', 'Cinque Terre|Treno', 'Portofino|Yacht', 'Via XX Settembre|Shopping', 'Mugugno|Lamentela',
      'Fabrizio De André|Cantautore', 'Mareggiata|Vento', 'Ascensore di Castelletto|Panorama', 'Piazza De Ferrari|Fontana',
      'Paganini|Violino', 'Porto Antico|Bigo', 'Autobus che non passa|Attesa', 'Pandolce|Uvetta', 'Tramontana|Freddo',
      'Spiaggia di scogli|Scarpette', 'Braccino corto|Portafoglio', 'Pansoti|Salsa di noci',
    ],
  },
  {
    id: 'cringe', name: 'Cringe & Social', icon: '😬', funny: true, words: [
      'Storia con musica triste|Sguardo', 'Hashtag ovunque|Cancelletto', 'Balletto di TikTok in pubblico|Telefono',
      '"Buongiornissimo kaffè"|Gruppo famiglia', 'Selfie allo specchio della palestra|Muscoli', 'Unboxing|Scatola',
      'Gender reveal|Fumo', 'Commento "primo!"|Velocità', 'Video di reazione|Faccia', 'Post motivazionale su LinkedIn|Crescita',
      'Auguri cantati in vocale|Stonato', 'Relazione ufficiale su Facebook|Stato', 'Filtro con le orecchie da cane|Lingua fuori',
      'Influencer che chiede scusa piangendo|Scuse', 'Taggato nella foto brutta|Doppio mento', 'Poesia sotto un tramonto|Didascalia',
      'Mettersi like da soli|Autostima', 'Filmare tutto il concerto|Telefoni alzati', '"Ricambio follow"|Follower',
      'Giveaway|Regalo', 'Scherzo con telecamera nascosta|Vittima', 'Diretta alle 2 di notte|Spettatori',
      'Coppia che fa video ovunque|Contenuti',
    ],
  },
];

if (typeof module !== 'undefined') module.exports = CATEGORIES;
else window.CATEGORIES = CATEGORIES;
