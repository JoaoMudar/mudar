--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: fixed_cost_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.fixed_cost_category AS ENUM (
    'salarios',
    'energia',
    'agua',
    'manutencao',
    'combustivel',
    'depreciacao',
    'outros'
);


--
-- Name: input_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.input_category AS ENUM (
    'substrato',
    'adubo',
    'defensivo',
    'recipiente',
    'outros'
);


--
-- Name: species_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.species_category AS ENUM (
    'frutifera',
    'ornamental',
    'madeira',
    'restauracao',
    'pioneira',
    'climax'
);


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: containers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.containers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    volume_liters numeric(6,3),
    substrate_per_unit_liters numeric(6,3),
    unit_cost numeric(10,2),
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fixed_costs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fixed_costs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category public.fixed_cost_category NOT NULL,
    monthly_amount numeric(12,2) NOT NULL,
    reference_month date NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: input_price_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.input_price_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    input_id uuid NOT NULL,
    cost_per_unit numeric(10,2) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text
);


--
-- Name: input_usages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.input_usages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    input_id uuid NOT NULL,
    species_id uuid NOT NULL,
    container_id uuid NOT NULL,
    quantity numeric(10,3) NOT NULL,
    usage_date date DEFAULT CURRENT_DATE NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT input_usages_quantity_check CHECK ((quantity > (0)::numeric))
);


--
-- Name: inputs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inputs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    category public.input_category NOT NULL,
    unit_of_measure text NOT NULL,
    cost_per_unit numeric(10,2),
    supplier text,
    last_purchase_date date,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: production_costs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_costs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    species_id uuid NOT NULL,
    container_id uuid NOT NULL,
    substrate_cost numeric(10,2) DEFAULT 0 NOT NULL,
    seed_cost numeric(10,2) DEFAULT 0 NOT NULL,
    input_costs_json jsonb DEFAULT '[]'::jsonb NOT NULL,
    labor_minutes numeric(8,2) DEFAULT 0 NOT NULL,
    labor_cost numeric(10,2) DEFAULT 0 NOT NULL,
    total_variable_cost numeric(12,2) GENERATED ALWAYS AS (((substrate_cost + seed_cost) + labor_cost)) STORED,
    calculated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: seed_collection_costs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seed_collection_costs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    species_id uuid NOT NULL,
    collection_region text,
    distance_km numeric(8,2),
    fuel_cost numeric(10,2),
    labor_hours numeric(8,2),
    labor_cost_per_hour numeric(10,2),
    total_cost numeric(12,2) NOT NULL,
    seeds_collected_qty integer,
    cost_per_seed numeric(10,4) GENERATED ALWAYS AS (
CASE
    WHEN (seeds_collected_qty > 0) THEN (total_cost / (seeds_collected_qty)::numeric)
    ELSE NULL::numeric
END) STORED,
    collection_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: species; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.species (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    common_name text NOT NULL,
    scientific_name text,
    category public.species_category NOT NULL,
    germination_time_days integer,
    growth_time_months integer,
    notes text,
    photo_url text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: species_unit_cost; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.species_unit_cost AS
 WITH current_fixed_total AS (
         SELECT COALESCE(sum(fixed_costs.monthly_amount), (0)::numeric) AS total
           FROM public.fixed_costs
          WHERE (fixed_costs.reference_month = (date_trunc('month'::text, now()))::date)
        ), active_combinations AS (
         SELECT count(*) AS qty
           FROM (public.production_costs pc_1
             JOIN public.species s_1 ON ((s_1.id = pc_1.species_id)))
          WHERE (s_1.active = true)
        )
 SELECT s.id AS species_id,
    s.common_name,
    s.scientific_name,
    s.category,
    c.id AS container_id,
    c.name AS container_name,
    pc.substrate_cost,
    pc.seed_cost,
    pc.labor_cost,
    pc.input_costs_json,
    pc.total_variable_cost,
    cft.total AS total_fixed_cost_month,
        CASE
            WHEN (ac.qty > 0) THEN round((cft.total / (ac.qty)::numeric), 4)
            ELSE (0)::numeric
        END AS fixed_cost_allocated,
    (pc.total_variable_cost +
        CASE
            WHEN (ac.qty > 0) THEN round((cft.total / (ac.qty)::numeric), 4)
            ELSE (0)::numeric
        END) AS unit_cost_estimated,
    pc.calculated_at
   FROM ((((public.production_costs pc
     JOIN public.species s ON ((s.id = pc.species_id)))
     JOIN public.containers c ON ((c.id = pc.container_id)))
     CROSS JOIN current_fixed_total cft)
     CROSS JOIN active_combinations ac)
  WHERE (s.active = true);


--
-- Data for Name: containers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.containers (id, name, volume_liters, substrate_per_unit_liters, unit_cost, active, created_at) FROM stdin;
\.


--
-- Data for Name: fixed_costs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fixed_costs (id, category, monthly_amount, reference_month, notes, created_at) FROM stdin;
\.


--
-- Data for Name: input_price_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.input_price_history (id, input_id, cost_per_unit, changed_at, notes) FROM stdin;
\.


--
-- Data for Name: input_usages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.input_usages (id, input_id, species_id, container_id, quantity, usage_date, notes, created_at) FROM stdin;
\.


--
-- Data for Name: inputs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inputs (id, name, category, unit_of_measure, cost_per_unit, supplier, last_purchase_date, active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: production_costs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.production_costs (id, species_id, container_id, substrate_cost, seed_cost, input_costs_json, labor_minutes, labor_cost, calculated_at, created_at) FROM stdin;
\.


--
-- Data for Name: seed_collection_costs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.seed_collection_costs (id, species_id, collection_region, distance_km, fuel_cost, labor_hours, labor_cost_per_hour, total_cost, seeds_collected_qty, collection_date, created_at) FROM stdin;
\.


--
-- Data for Name: species; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.species (id, common_name, scientific_name, category, germination_time_days, growth_time_months, notes, photo_url, active, created_at, updated_at) FROM stdin;
\.


--
-- Name: containers containers_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.containers
    ADD CONSTRAINT containers_name_key UNIQUE (name);


--
-- Name: containers containers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.containers
    ADD CONSTRAINT containers_pkey PRIMARY KEY (id);


--
-- Name: fixed_costs fixed_costs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixed_costs
    ADD CONSTRAINT fixed_costs_pkey PRIMARY KEY (id);


--
-- Name: input_price_history input_price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.input_price_history
    ADD CONSTRAINT input_price_history_pkey PRIMARY KEY (id);


--
-- Name: input_usages input_usages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.input_usages
    ADD CONSTRAINT input_usages_pkey PRIMARY KEY (id);


--
-- Name: inputs inputs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inputs
    ADD CONSTRAINT inputs_pkey PRIMARY KEY (id);


--
-- Name: production_costs production_costs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_costs
    ADD CONSTRAINT production_costs_pkey PRIMARY KEY (id);


--
-- Name: production_costs production_costs_species_id_container_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_costs
    ADD CONSTRAINT production_costs_species_id_container_id_key UNIQUE (species_id, container_id);


--
-- Name: seed_collection_costs seed_collection_costs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seed_collection_costs
    ADD CONSTRAINT seed_collection_costs_pkey PRIMARY KEY (id);


--
-- Name: species species_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.species
    ADD CONSTRAINT species_pkey PRIMARY KEY (id);


--
-- Name: idx_fixed_costs_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fixed_costs_month ON public.fixed_costs USING btree (reference_month);


--
-- Name: idx_input_price_history; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_input_price_history ON public.input_price_history USING btree (input_id, changed_at DESC);


--
-- Name: idx_input_usages_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_input_usages_date ON public.input_usages USING btree (usage_date);


--
-- Name: idx_input_usages_input; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_input_usages_input ON public.input_usages USING btree (input_id);


--
-- Name: idx_input_usages_species; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_input_usages_species ON public.input_usages USING btree (species_id);


--
-- Name: idx_inputs_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inputs_category ON public.inputs USING btree (category);


--
-- Name: idx_production_costs_container; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_costs_container ON public.production_costs USING btree (container_id);


--
-- Name: idx_production_costs_species; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_costs_species ON public.production_costs USING btree (species_id);


--
-- Name: idx_seed_collection_species; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seed_collection_species ON public.seed_collection_costs USING btree (species_id);


--
-- Name: idx_species_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_species_active ON public.species USING btree (active);


--
-- Name: idx_species_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_species_category ON public.species USING btree (category);


--
-- Name: inputs inputs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER inputs_updated_at BEFORE UPDATE ON public.inputs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: species species_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER species_updated_at BEFORE UPDATE ON public.species FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: input_price_history input_price_history_input_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.input_price_history
    ADD CONSTRAINT input_price_history_input_id_fkey FOREIGN KEY (input_id) REFERENCES public.inputs(id) ON DELETE CASCADE;


--
-- Name: input_usages input_usages_container_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.input_usages
    ADD CONSTRAINT input_usages_container_id_fkey FOREIGN KEY (container_id) REFERENCES public.containers(id);


--
-- Name: input_usages input_usages_input_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.input_usages
    ADD CONSTRAINT input_usages_input_id_fkey FOREIGN KEY (input_id) REFERENCES public.inputs(id);


--
-- Name: input_usages input_usages_species_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.input_usages
    ADD CONSTRAINT input_usages_species_id_fkey FOREIGN KEY (species_id) REFERENCES public.species(id);


--
-- Name: production_costs production_costs_container_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_costs
    ADD CONSTRAINT production_costs_container_id_fkey FOREIGN KEY (container_id) REFERENCES public.containers(id);


--
-- Name: production_costs production_costs_species_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_costs
    ADD CONSTRAINT production_costs_species_id_fkey FOREIGN KEY (species_id) REFERENCES public.species(id);


--
-- Name: seed_collection_costs seed_collection_costs_species_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seed_collection_costs
    ADD CONSTRAINT seed_collection_costs_species_id_fkey FOREIGN KEY (species_id) REFERENCES public.species(id);


--
-- Name: input_usages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.input_usages ENABLE ROW LEVEL SECURITY;

--
-- Name: input_usages input_usages_auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY input_usages_auth_all ON public.input_usages USING (true);


--
-- PostgreSQL database dump complete
--

