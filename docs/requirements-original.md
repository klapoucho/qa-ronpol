# Wymagania (oryginał)

## Cel

Celem zadania jest zaprezentowanie Twojego podejścia do projektowania i implementacji automatycznych testów oraz budowy nowoczesnego frameworka testowego.

Będziemy oceniać nie tylko same testy, ale również:

- architekturę rozwiązania,
- jakość kodu,
- zastosowane dobre praktyki,
- podejście do utrzymania i skalowalności projektu.

## Aplikacja do testowania

Repozytorium aplikacji: <https://github.com/jaktestowac/rolnopol>

## Zakres zadania

### 1. Framework testowy

Zbuduj od podstaw framework do automatyzacji testów dla powyższej aplikacji używając frameworka Playwright.

Framework powinien zawierać m.in.:

- czytelną strukturę projektu,
- warstwę abstrakcji (np. Page Object Model),
- mechanizmy konfiguracji środowisk,
- obsługę danych testowych,
- raportowanie wyników testów.

### 2. Testy automatyczne

Zaimplementuj 5 różnych testów, np.:

- testy UI (kluczowe ścieżki użytkownika),
- testy API,
- testy integracyjne Frontendu na mockach.

Testy powinny:

- być czytelne i utrzymywalne,
- pokrywać istotne scenariusze biznesowe,
- zawierać asercje weryfikujące poprawność działania aplikacji.

### 3. Jakość i standardy

W projekcie zastosuj dobre praktyki inżynierskie, takie jak:

#### Narzędzia i konfiguracja

- statyczna analiza kodu (np. ESLint, Biome),
- formatowanie kodu (np. Prettier),
- konfiguracja TypeScript,
- zarządzanie zależnościami,
- konfiguracja środowisk (env / config files).

#### Architektura

- separacja warstw (testy, logika, konfiguracja),
- reużywalność komponentów,
- skalowalność rozwiązania.

#### Automatyzacja

- skrypty uruchamiania testów,
- możliwość uruchomienia testów lokalnie oraz CI-ready.

### 4. Dokumentacja

Dodaj README zawierające:

- opis technologii i decyzji architektonicznych,
- instrukcję uruchomienia testów,
- opis struktury projektu,
- ewentualne założenia i ograniczenia.

## Forma oddania

- Publiczne repozytorium GitHub / GitLab / Bitbucket
- Historia commitów (mile widziana czytelna historia pracy)
- Gotowe do uruchomienia przez osobę trzecią

## Na co zwrócimy uwagę

- jakość i czytelność kodu,
- architekturę frameworka,
- dobór narzędzi,
- pokrycie scenariuszy testowych,
- zastosowanie dobrych praktyk,
- podejście do problemu (a nie tylko wynik końcowy).

## Mile widziane (bonus)

- parallel execution,
- mockowanie danych,
- test data management.
