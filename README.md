# Nauka TI – fiszki i quizy z Technologii Informacyjnej

Aplikacja do szybkiej nauki odpowiedzi do **testu 1 (100 pytań)** i **testu 2 (96 pytań)** z Technologii Informacyjnej. Działa w przeglądarce na telefonie i komputerze, bez logowania i bez instalacji. Po pierwszym otwarciu działa też offline.

**Link do aplikacji (GitHub Pages):** https://bucio880.github.io/nauka-ti/

## Tryby nauki

| Tryb | Jak działa |
|---|---|
| **Ucz się** (główny) | Rundy po 20 pytań ABCD. Aplikacja sama dobiera nowe pytania i te, które trzeba powtórzyć (system powtórek Leitnera). Błędne odpowiedzi wracają jeszcze w tej samej rundzie, a potem po minucie, 10 minutach, godzinie, 5 godzinach itd. Po każdej odpowiedzi widać pełną odpowiedź z notatek. |
| **Fiszki** | Pytanie → odpowiadasz w głowie → odkrywasz odpowiedź → oceniasz się: *Nie wiem / Prawie / Wiem*. |
| **Egzamin próbny** | 20, 40, 60 albo wszystkie pytania. Losowa kolejność, licznik czasu, wynik i lista błędów na końcu. |
| **Moje błędy** | Tylko pytania, w których ktoś się mylił, a których jeszcze nie opanował. |
| **Ściąga** | Wszystkie pytania z odpowiedziami. Wyszukiwarka działa także bez polskich znaków (np. „przegladarka”). Są filtry po temacie i stanie nauki. |
| **Tematy** | Kliknięcie tematu na stronie głównej uruchamia rundę tylko z tego działu. |

Można wybrać zakres: oba testy, tylko test 1 albo tylko test 2.

Postęp zapisuje się w przeglądarce na danym urządzeniu (`localStorage`), nie trzeba niczego zakładać. Pytanie jest **opanowane**, gdy zostanie poprawnie powtórzone kilka razy, w tym po co najmniej godzinie przerwy.

## Zgodność z notatkami

Pytania i poprawne odpowiedzi są przepisane 1:1 z notatek i sprawdzone skryptem z tekstem z PDF-ów. Wszystkie poprawki (literówki z OCR) oraz miejsca, gdzie notatki zawierają błąd lub ucięty tekst, są opisane w pliku **[KOREKTY.md](KOREKTY.md)**. W aplikacji takie pytania mają ostrzeżenie ⚠️.

## Hosting

To czysta strona statyczna: HTML, CSS i JS, bez serwera i bez bazy danych. Wszystkie ścieżki są względne, więc działa w dowolnym folderze.

### GitHub Pages (za darmo)

1. W repozytorium wejdź w **Settings → Pages**.
2. W polu **Source** wybierz **Deploy from a branch**. W polu **Branch** wybierz `main` i folder `/ (root)`, potem kliknij **Save**.
3. Po 1–2 minutach strona działa pod adresem `https://bucio880.github.io/nauka-ti/`.

### seohost (albo dowolny hosting z FTP)

1. Pobierz paczkę: na GitHubie **Code → Download ZIP** i rozpakuj ją.
2. Wgraj do `public_html` (lub do podfolderu, np. `public_html/nauka-ti/`) te pliki i foldery: `index.html`, `style.css`, `app.js`, `sw.js`, `manifest.webmanifest`, `data/` oraz `icons/`.
3. Gotowe, np. `https://twojadomena.pl/nauka-ti/`. Do działania offline potrzebny jest HTTPS (na seohost jest darmowy certyfikat SSL).

## Jak zmienić pytania

- Pytania są w plikach `data/test1.js` i `data/test2.js`. Opis pól jest na górze każdego pliku:
  - `a` – poprawne odpowiedzi z notatek;
  - `k` – krótsza wersja do quizu;
  - `z` – błędne opcje do quizu;
  - `u` – ostrzeżenie;
  - `noquiz` – pytanie tylko na fiszkach.
- Po każdej zmianie plików podbij numer `VERSION` w `sw.js` oraz `?v=` w `index.html` i w `sw.js`. Inaczej telefony, które mają już stronę w pamięci, dostaną nową wersję dopiero przy kolejnym otwarciu.

## Technicznie

- Bez frameworków i bez budowania: wystarczy otworzyć `index.html` przez dowolny serwer HTTP, np. `npx http-server .`.
- Wygląd dostosowany do telefonów, jasny i ciemny motyw (automatycznie lub ręcznie w ustawieniach), obsługa klawiatury (1–4 / A–D, Enter, Esc).
- PWA: można dodać stronę do ekranu głównego telefonu. Service worker zapisuje pliki do pracy offline.
