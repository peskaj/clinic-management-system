# Programowanie aplikacji webowych
wersja dla studiów niestacjonarnych

## Wymagania systemowe
* git
* nodejs v20+
* angular (instalacja przez `npm install -g @angular/cli`)

## Jak skorzystać z tego kodu

### Klonowanie plików do lokalnego katalogu
```bash
git clone https://gitlab.com/mariusz.jarocki/paw2026z.git
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
* http://localhost:3000 (zbudowany frontend)
* http://localhost:4200 (serwer developerski)