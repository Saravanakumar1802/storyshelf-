"""
The starting shelf: Project Gutenberg ids, in featured order (the first twelve
fill the 3D shelf on the home page).

The list was chosen to be:
- loved and varied across genres, with a few Indian voices (Tagore);
- public domain in the USA *and* India: every author and translator died by
  1965, and app/ingest/gutenberg/licence.py re-checks this on every import;
- mid-sized: the 200 MB storage budget fits about 60 books, so doorstops like
  War and Peace are left for later.
"""

CURATED: list[tuple[int, str]] = [
    # ── the featured shelf ──
    (1342, "Pride and Prejudice — Jane Austen"),
    (84, "Frankenstein — Mary Shelley"),
    (1661, "The Adventures of Sherlock Holmes — Arthur Conan Doyle"),
    (11, "Alice's Adventures in Wonderland — Lewis Carroll"),
    (345, "Dracula — Bram Stoker"),
    (64317, "The Great Gatsby — F. Scott Fitzgerald"),
    (174, "The Picture of Dorian Gray — Oscar Wilde"),
    (7164, "Gitanjali — Rabindranath Tagore"),
    (35, "The Time Machine — H. G. Wells"),
    (120, "Treasure Island — Robert Louis Stevenson"),
    (1260, "Jane Eyre — Charlotte Brontë"),
    (2554, "Crime and Punishment — Fyodor Dostoyevsky"),
    # ── the rest of the shelves ──
    (768, "Wuthering Heights — Emily Brontë"),
    (98, "A Tale of Two Cities — Charles Dickens"),
    (46, "A Christmas Carol — Charles Dickens"),
    (43, "The Strange Case of Dr Jekyll and Mr Hyde — Robert Louis Stevenson"),
    (36, "The War of the Worlds — H. G. Wells"),
    (5230, "The Invisible Man — H. G. Wells"),
    (164, "Twenty Thousand Leagues Under the Sea — Jules Verne"),
    (103, "Around the World in Eighty Days — Jules Verne"),
    (16, "Peter Pan — J. M. Barrie"),
    (55, "The Wonderful Wizard of Oz — L. Frank Baum"),
    (161, "Sense and Sensibility — Jane Austen"),
    (105, "Persuasion — Jane Austen"),
    (76, "Adventures of Huckleberry Finn — Mark Twain"),
    (74, "The Adventures of Tom Sawyer — Mark Twain"),
    (1952, "The Yellow Wallpaper — Charlotte Perkins Gilman"),
    (219, "Heart of Darkness — Joseph Conrad"),
    (2680, "Meditations — Marcus Aurelius"),
    (1232, "The Prince — Niccolò Machiavelli"),
    (2591, "Grimms' Fairy Tales — Jacob and Wilhelm Grimm"),
    (2814, "Dubliners — James Joyce"),
    (113, "The Secret Garden — Frances Hodgson Burnett"),
    (45, "Anne of Green Gables — L. M. Montgomery"),
    (236, "The Jungle Book — Rudyard Kipling"),
    (244, "A Study in Scarlet — Arthur Conan Doyle"),
    (2852, "The Hound of the Baskervilles — Arthur Conan Doyle"),
    (215, "The Call of the Wild — Jack London"),
    (205, "Walden — Henry David Thoreau"),
    (33, "The Scarlet Letter — Nathaniel Hawthorne"),
    (41, "The Legend of Sleepy Hollow — Washington Irving"),
    (1934, "Songs of Innocence and of Experience — William Blake"),
    (23, "Narrative of the Life of Frederick Douglass — Frederick Douglass"),
    (3825, "Pygmalion — George Bernard Shaw"),
    (1513, "Romeo and Juliet — William Shakespeare"),
    (62, "A Princess of Mars — Edgar Rice Burroughs"),
    (932, "The Fall of the House of Usher — Edgar Allan Poe"),
    (829, "Gulliver's Travels — Jonathan Swift"),
    (1727, "The Odyssey — Homer (tr. Samuel Butler)"),
    (19942, "Candide — Voltaire"),
    (4363, "Beyond Good and Evil — Friedrich Nietzsche"),
    (2542, "A Doll's House — Henrik Ibsen"),
    (1080, "A Modest Proposal — Jonathan Swift"),
    (514, "Little Women — Louisa May Alcott"),
    (910, "White Fang — Jack London"),
    (6130, "The Iliad — Homer"),
    (1322, "Leaves of Grass — Walt Whitman"),
    (158, "Emma — Jane Austen"),
    (1400, "Great Expectations — Charles Dickens"),
    (2097, "The Sign of the Four — Arthur Conan Doyle"),
]
