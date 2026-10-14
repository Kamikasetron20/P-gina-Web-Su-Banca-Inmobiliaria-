-- PLANTILLA: revisar contra su esquema y policies actuales antes de ejecutar.
-- 1) Cerrar signups en Auth > Providers > Email ("Allow new users to sign up" = off).
-- 2) Lectura pública SOLO de columnas comerciales (RLS no filtra columnas):
revoke select on public.propiedades from anon;
grant select (id,nombre,tipo,gestion,zona,precio,habitaciones,banos,area,parqueaderos,estrato,
              descripcion,asesor,created_at,imagen,imagenes,estado) on public.propiedades to anon;
-- 3) Escritura solo del dueño autenticado:
-- create policy "owner write" on public.propiedades for all to authenticated
--   using (propietario_id = auth.uid()) with check (propietario_id = auth.uid());
-- 4) Storage subanca-assets: SELECT público; INSERT/UPDATE/DELETE solo authenticated
--    con (storage.foldername(name))[1] = 'propiedades'.
