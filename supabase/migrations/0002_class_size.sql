-- Počet žáků ve třídě. Bez přihlašování aplikace nezná jmenný seznam,
-- ale samotné číslo stačí na postup „8 z 12 vybralo" a na upozornění,
-- že ještě někdo chybí — přesně jak to ukazuje návrh.
alter table public.classes
  add column if not exists student_count int check (student_count is null or student_count between 1 and 200);
