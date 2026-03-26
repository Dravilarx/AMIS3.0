-- Agregar foreign key entre news_articles y profiles
-- Necesario para que PostgREST pueda hacer el JOIN automático en select('*, profiles(*)')

ALTER TABLE public.news_articles
ADD CONSTRAINT fk_news_articles_author
FOREIGN KEY (author_id)
REFERENCES public.profiles(id)
ON DELETE SET NULL;
