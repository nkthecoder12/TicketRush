--
-- PostgreSQL database dump
--

\restrict rQ07LVCqO7TbMcTderDrhG5reshQScvws4eZMhKe5ZiG4ijxJqRunkbU5hL7gUO

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    event_id bigint NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    payment_status character varying(20) DEFAULT 'NOT_PAID'::character varying NOT NULL,
    CONSTRAINT bookings_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['PENDING'::character varying, 'NOT_PAID'::character varying, 'PAID'::character varying, 'REFUND_PENDING'::character varying, 'REFUNDED'::character varying, 'REFUND_FAILED'::character varying])::text[]))),
    CONSTRAINT bookings_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'CONFIRMED'::character varying, 'CANCELLED'::character varying, 'FAILED'::character varying, 'EXPIRED'::character varying])::text[])))
);


--
-- Name: bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.bookings ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.bookings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: event_seats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_seats (
    id bigint NOT NULL,
    event_id bigint NOT NULL,
    seat_id bigint NOT NULL,
    price numeric(10,2) NOT NULL,
    status character varying(20) DEFAULT 'AVAILABLE'::character varying NOT NULL,
    CONSTRAINT event_seats_price_check CHECK ((price > (0)::numeric)),
    CONSTRAINT event_seats_status_check CHECK (((status)::text = ANY ((ARRAY['AVAILABLE'::character varying, 'HELD'::character varying, 'BOOKED'::character varying])::text[])))
);


--
-- Name: event_seats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.event_seats ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.event_seats_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id bigint NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    category character varying(50) NOT NULL,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone NOT NULL,
    price numeric(10,2) NOT NULL,
    total_tickets integer NOT NULL,
    available_tickets integer NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    venue_id bigint NOT NULL,
    CONSTRAINT events_check CHECK (((available_tickets >= 0) AND (available_tickets <= total_tickets))),
    CONSTRAINT events_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT events_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'cancelled'::character varying, 'completed'::character varying])::text[]))),
    CONSTRAINT events_total_tickets_check CHECK ((total_tickets > 0)),
    CONSTRAINT valid_event_dates CHECK ((end_date > start_date))
);


--
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.events ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: idempotency_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.idempotency_requests (
    user_id uuid NOT NULL,
    event_id bigint NOT NULL,
    idempotency_key uuid NOT NULL,
    request_body_hash text NOT NULL,
    status character varying(20) NOT NULL,
    response_body jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT idempotency_requests_status_check CHECK (((status)::text = ANY ((ARRAY['processing'::character varying, 'completed'::character varying])::text[])))
);


--
-- Name: seat_holds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seat_holds (
    id bigint NOT NULL,
    event_seat_id bigint NOT NULL,
    user_id uuid NOT NULL,
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT seat_holds_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'EXPIRED'::character varying, 'COMPLETED'::character varying])::text[])))
);


--
-- Name: seat_holds_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.seat_holds ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.seat_holds_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: seats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seats (
    id bigint NOT NULL,
    venue_id bigint NOT NULL,
    section character varying(20) NOT NULL,
    row_label character varying(10) NOT NULL,
    seat_number integer NOT NULL
);


--
-- Name: seats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.seats ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.seats_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    role character varying(20) DEFAULT 'USER'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: venues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.venues (
    id bigint NOT NULL,
    name character varying(150) NOT NULL,
    address text,
    capacity integer NOT NULL,
    city character varying NOT NULL,
    CONSTRAINT venues_capacity_check CHECK ((capacity > 0))
);


--
-- Name: venues_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.venues ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.venues_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: event_seats event_seats_event_id_seat_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_seats
    ADD CONSTRAINT event_seats_event_id_seat_id_key UNIQUE (event_id, seat_id);


--
-- Name: event_seats event_seats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_seats
    ADD CONSTRAINT event_seats_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: seat_holds seat_holds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_holds
    ADD CONSTRAINT seat_holds_pkey PRIMARY KEY (id);


--
-- Name: seats seats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seats
    ADD CONSTRAINT seats_pkey PRIMARY KEY (id);


--
-- Name: seats seats_venue_id_section_row_label_seat_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seats
    ADD CONSTRAINT seats_venue_id_section_row_label_seat_number_key UNIQUE (venue_id, section, row_label, seat_number);


--
-- Name: idempotency_requests unique_idempotency_request; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idempotency_requests
    ADD CONSTRAINT unique_idempotency_request UNIQUE (user_id, event_id, idempotency_key);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: venues venues_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venues
    ADD CONSTRAINT venues_name_key UNIQUE (name);


--
-- Name: venues venues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venues
    ADD CONSTRAINT venues_pkey PRIMARY KEY (id);


--
-- Name: unique_active_seat_hold; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_active_seat_hold ON public.seat_holds USING btree (event_seat_id) WHERE ((status)::text = 'ACTIVE'::text);


--
-- Name: bookings bookings_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id);


--
-- Name: bookings bookings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: event_seats event_seats_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_seats
    ADD CONSTRAINT event_seats_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id);


--
-- Name: event_seats event_seats_seat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_seats
    ADD CONSTRAINT event_seats_seat_id_fkey FOREIGN KEY (seat_id) REFERENCES public.seats(id);


--
-- Name: events events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: events events_venue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(id);


--
-- Name: idempotency_requests idempotency_requests_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idempotency_requests
    ADD CONSTRAINT idempotency_requests_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id);


--
-- Name: idempotency_requests idempotency_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idempotency_requests
    ADD CONSTRAINT idempotency_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: seat_holds seat_holds_event_seat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_holds
    ADD CONSTRAINT seat_holds_event_seat_id_fkey FOREIGN KEY (event_seat_id) REFERENCES public.event_seats(id);


--
-- Name: seat_holds seat_holds_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_holds
    ADD CONSTRAINT seat_holds_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: seats seats_venue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seats
    ADD CONSTRAINT seats_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(id);


--
-- PostgreSQL database dump complete
--

\unrestrict rQ07LVCqO7TbMcTderDrhG5reshQScvws4eZMhKe5ZiG4ijxJqRunkbU5hL7gUO

