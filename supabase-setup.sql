-- ============================================================
-- ECOCOFFIEPLANET · Base de datos (Supabase / PostgreSQL)
-- ------------------------------------------------------------
-- CÓMO USARLO:
-- 1. Entra a tu proyecto en https://supabase.com
-- 2. Menú izquierdo → "SQL Editor" → "New query"
-- 3. Pega TODO este archivo y presiona "Run".
-- (Se puede volver a ejecutar sin problema, salvo la parte 8 de datos.)
-- ============================================================

-- ---------- 1. PRODUCTOS ----------
create table if not exists public.productos (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  descripcion  text,
  precio       integer not null default 0,   -- en pesos (0 = sin precio aún)
  imagen       text,
  etiqueta     text default '',
  creado_en    timestamptz not null default now()
);

-- ---------- 2. PERFILES (rol admin / cliente) ----------
-- Se enlaza con los usuarios de Supabase Auth (contraseñas cifradas por defecto).
create table if not exists public.perfiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text,
  correo     text,
  rol        text not null default 'cliente' check (rol in ('admin','cliente')),
  creado_en  timestamptz not null default now()
);

-- ---------- 3. REACCIONES ----------
-- "cliente_id" identifica el navegador/dispositivo (reacción sin registro).
create table if not exists public.reacciones (
  id           uuid primary key default gen_random_uuid(),
  producto_id  uuid not null references public.productos(id) on delete cascade,
  cliente_id   text not null,
  tipo         text not null check (tipo in ('like','love','dislike')),
  creado_en    timestamptz not null default now(),
  unique (producto_id, cliente_id)          -- solo UNA reacción por persona y producto
);
create index if not exists idx_reacciones_producto on public.reacciones(producto_id);

-- ---------- 4. ¿El usuario actual es admin? ----------
create or replace function public.es_admin()
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'admin');
$$;

-- ---------- 5. CONTEO DE REACCIONES POR PRODUCTO ----------
create or replace function public.conteo_reacciones()
returns table (producto_id uuid, likes bigint, loves bigint, dislikes bigint, total bigint)
language sql stable as $$
  select producto_id,
    count(*) filter (where tipo = 'like')    as likes,
    count(*) filter (where tipo = 'love')    as loves,
    count(*) filter (where tipo = 'dislike') as dislikes,
    count(*)                                  as total
  from public.reacciones
  group by producto_id;
$$;

-- ---------- 6. SEGURIDAD (Row Level Security) ----------
alter table public.productos  enable row level security;
alter table public.reacciones enable row level security;
alter table public.perfiles   enable row level security;

-- Productos: todos pueden LEER; solo el admin puede crear/editar/borrar
drop policy if exists productos_leer         on public.productos;
drop policy if exists productos_admin_insert on public.productos;
drop policy if exists productos_admin_update on public.productos;
drop policy if exists productos_admin_delete on public.productos;
create policy productos_leer         on public.productos for select using (true);
create policy productos_admin_insert on public.productos for insert with check (public.es_admin());
create policy productos_admin_update on public.productos for update using (public.es_admin());
create policy productos_admin_delete on public.productos for delete using (public.es_admin());

-- Reacciones: todos pueden LEER y REACCIONAR (sin registro)
drop policy if exists reacciones_leer   on public.reacciones;
drop policy if exists reacciones_crear  on public.reacciones;
drop policy if exists reacciones_editar on public.reacciones;
drop policy if exists reacciones_borrar on public.reacciones;
create policy reacciones_leer   on public.reacciones for select using (true);
create policy reacciones_crear  on public.reacciones for insert with check (true);
create policy reacciones_editar on public.reacciones for update using (true);
create policy reacciones_borrar on public.reacciones for delete using (true);

-- Perfiles: cada quien ve el suyo; el admin ve todos
drop policy if exists perfiles_leer on public.perfiles;
create policy perfiles_leer on public.perfiles for select using (auth.uid() = id or public.es_admin());

-- Permisos para los roles públicos de Supabase
grant usage on schema public to anon, authenticated;
grant select on public.productos to anon, authenticated;
grant insert, update, delete on public.productos to authenticated;
grant select, insert, update, delete on public.reacciones to anon, authenticated;
grant select on public.perfiles to anon, authenticated;
grant execute on function public.conteo_reacciones() to anon, authenticated;
grant execute on function public.es_admin() to anon, authenticated;

-- ---------- 7. TIEMPO REAL para reacciones ----------
-- (si sale "already member of publication", ignóralo, ya está listo)
alter publication supabase_realtime add table public.reacciones;

-- ---------- 8. IMÁGENES (Storage) ----------
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do nothing;

drop policy if exists prod_img_leer   on storage.objects;
drop policy if exists prod_img_subir  on storage.objects;
drop policy if exists prod_img_editar on storage.objects;
drop policy if exists prod_img_borrar on storage.objects;
create policy prod_img_leer   on storage.objects for select using (bucket_id = 'productos');
create policy prod_img_subir  on storage.objects for insert with check (bucket_id = 'productos' and public.es_admin());
create policy prod_img_editar on storage.objects for update using (bucket_id = 'productos' and public.es_admin());
create policy prod_img_borrar on storage.objects for delete using (bucket_id = 'productos' and public.es_admin());

-- ---------- 9. DATOS INICIALES (los 5 productos actuales) ----------
-- Solo se insertan si la tabla está vacía (para no duplicar al re-ejecutar).
insert into public.productos (nombre, descripcion, precio, imagen, etiqueta)
select * from (values
  ('Jabón Natural de Café','Limpieza suave con exfoliación ligera. Ideal para el uso diario.',0,'https://images.unsplash.com/photo-1605265058749-78af14a1be2b?auto=format&fit=crop&w=700&q=80','Bestseller'),
  ('Exfoliante Corporal','Renueva la piel de todo el cuerpo con la textura del café.',0,'https://images.unsplash.com/photo-1672883584462-5b25f34af462?auto=format&fit=crop&w=700&q=80',''),
  ('Exfoliante Facial','Fórmula delicada para el rostro, deja la piel suave y luminosa.',0,'https://images.unsplash.com/photo-1766241883878-b8262bbce8f8?auto=format&fit=crop&w=700&q=80',''),
  ('Kit Natural','Jabón + exfoliante corporal + facial. El ritual completo.',0,'https://images.unsplash.com/photo-1599847935464-fde3827639c2?auto=format&fit=crop&w=700&q=80','Kit'),
  ('Jabón Artesanal Premium','Edición especial con aceites esenciales y cuncho seleccionado.',0,'https://images.unsplash.com/photo-1546552768-9e3a94b38a59?auto=format&fit=crop&w=700&q=80','Premium')
) as nuevos(nombre, descripcion, precio, imagen, etiqueta)
where not exists (select 1 from public.productos);

-- ============================================================
-- 10. HACERTE ADMINISTRADOR (ejecútalo DESPUÉS de crear tu
--     usuario en Authentication → Users → Add user).
--     Cambia el correo por el tuyo y quita los guiones "--":
-- ============================================================
-- insert into public.perfiles (id, nombre, correo, rol)
-- select id, 'Administrador', email, 'admin' from auth.users
-- where email = 'TU-CORREO-ADMIN@ejemplo.com'
-- on conflict (id) do update set rol = 'admin';
