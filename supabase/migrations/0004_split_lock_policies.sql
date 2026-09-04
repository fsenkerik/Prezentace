-- Dokončení opravy z 0003. Jedna společná politika nestačila: obsahovala
-- větev pro učitele, která odkazuje na assignments, a práva k tabulce se
-- kontrolují při plánování dotazu — tedy i když se ta větev nakonec
-- nevyhodnotí. Anonymní role proto stále dostávala permission denied.
--
-- Politiky se pro danou roli slučují přes OR, takže je stačí rozdělit:
-- anonymní verze na chráněnou tabulku vůbec neodkazuje.

drop policy if exists public_reads_locks on public.topic_locks;

create policy anon_reads_locks on public.topic_locks
  for select to anon
  using (public.assignment_is_public(assignment_id));

create policy teacher_reads_locks on public.topic_locks
  for select to authenticated
  using (
    public.assignment_is_public(assignment_id)
    or exists (select 1 from public.assignments a
                where a.id = topic_locks.assignment_id
                  and a.teacher_id = auth.uid())
  );
