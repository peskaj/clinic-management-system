# Programowanie aplikacji webowych

## Wymagania systemowe
* git
* nodejs v20+

## Jak skorzystać z tego kodu

### Klonowanie plików do lokalnego katalogu
```bash
git clone https://gitlab.com/mariusz.jarocki/paw2026.git
```

### Instalacja zależności
```bash
npm install
```

### Uruchomienie backendu
#### Wersja deweloperska ("live")
```bash
npm run dev
```
#### Wersja produkcyjna
```bash
npm run build
node dist/index
```

### Sprawdzenie działania
Użyj adresów w przeglądarce:
* http://localhost:3000
* http://localhost:3000/hello
* http://localhost:3000/hello?q=ala+ma+kota
