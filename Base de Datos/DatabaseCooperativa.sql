--
-- PostgreSQL database dump
--

\restrict qnziHh7hByiolHg2VBKneayynKwM2wgWcSKYGiobYGY4td50iqsRnCDb0Mi3O86

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.2

-- Started on 2026-05-06 19:35:20 AST

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
-- TOC entry 879 (class 1247 OID 16412)
-- Name: estado_aportacion; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.estado_aportacion AS ENUM (
    'pendiente',
    'validada',
    'rechazada'
);


ALTER TYPE public.estado_aportacion OWNER TO postgres;

--
-- TOC entry 882 (class 1247 OID 16420)
-- Name: estado_cuenta; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.estado_cuenta AS ENUM (
    'activa',
    'inactiva',
    'cerrada'
);


ALTER TYPE public.estado_cuenta OWNER TO postgres;

--
-- TOC entry 888 (class 1247 OID 16440)
-- Name: estado_cuota; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.estado_cuota AS ENUM (
    'pendiente',
    'pagada',
    'mora'
);


ALTER TYPE public.estado_cuota OWNER TO postgres;

--
-- TOC entry 885 (class 1247 OID 16428)
-- Name: estado_prestamo; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.estado_prestamo AS ENUM (
    'solicitado',
    'evaluacion',
    'aprobado',
    'rechazado',
    'pagado'
);


ALTER TYPE public.estado_prestamo OWNER TO postgres;

--
-- TOC entry 873 (class 1247 OID 16398)
-- Name: estado_socio; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.estado_socio AS ENUM (
    'activo',
    'inactivo',
    'suspendido'
);


ALTER TYPE public.estado_socio OWNER TO postgres;

--
-- TOC entry 906 (class 1247 OID 16488)
-- Name: estado_usuario; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.estado_usuario AS ENUM (
    'activo',
    'inactivo'
);


ALTER TYPE public.estado_usuario OWNER TO postgres;

--
-- TOC entry 900 (class 1247 OID 16472)
-- Name: formato_reporte; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.formato_reporte AS ENUM (
    'PDF',
    'Excel',
    'CSV',
    'pantalla',
    'pdf',
    'excel'
);


ALTER TYPE public.formato_reporte OWNER TO postgres;

--
-- TOC entry 891 (class 1247 OID 16448)
-- Name: metodo_pago; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.metodo_pago AS ENUM (
    'efectivo',
    'transferencia',
    'cheque'
);


ALTER TYPE public.metodo_pago OWNER TO postgres;

--
-- TOC entry 903 (class 1247 OID 16480)
-- Name: rol_usuario; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.rol_usuario AS ENUM (
    'admin',
    'cajero',
    'socio'
);


ALTER TYPE public.rol_usuario OWNER TO postgres;

--
-- TOC entry 876 (class 1247 OID 16406)
-- Name: tipo_aportacion; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tipo_aportacion AS ENUM (
    'ordinaria',
    'extraordinaria',
    'cuota_mensual',
    'ahorro',
    'abono_prestamo'
);


ALTER TYPE public.tipo_aportacion OWNER TO postgres;

--
-- TOC entry 894 (class 1247 OID 16456)
-- Name: tipo_movimiento; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tipo_movimiento AS ENUM (
    'deposito',
    'retiro'
);


ALTER TYPE public.tipo_movimiento OWNER TO postgres;

--
-- TOC entry 897 (class 1247 OID 16462)
-- Name: tipo_reporte; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tipo_reporte AS ENUM (
    'socios',
    'aportaciones',
    'prestamos',
    'financiero'
);


ALTER TYPE public.tipo_reporte OWNER TO postgres;

--
-- TOC entry 237 (class 1255 OID 16660)
-- Name: actualizar_saldo(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.actualizar_saldo() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE "Cuenta_ahorro"
    SET saldo = NEW.saldo_posterior
    WHERE id_cuenta = NEW.id_cuenta;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.actualizar_saldo() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 226 (class 1259 OID 16549)
-- Name: Aportacion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Aportacion" (
    id_aportacion integer NOT NULL,
    id_socio integer,
    monto numeric(12,2) NOT NULL,
    fecha timestamp without time zone,
    tipo public.tipo_aportacion,
    estado public.estado_aportacion DEFAULT 'pendiente'::public.estado_aportacion,
    validado_por integer
);


ALTER TABLE public."Aportacion" OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16548)
-- Name: Aportacion_id_aportacion_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Aportacion_id_aportacion_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Aportacion_id_aportacion_seq" OWNER TO postgres;

--
-- TOC entry 3970 (class 0 OID 0)
-- Dependencies: 225
-- Name: Aportacion_id_aportacion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Aportacion_id_aportacion_seq" OWNED BY public."Aportacion".id_aportacion;


--
-- TOC entry 227 (class 1259 OID 16568)
-- Name: Cuenta_ahorro; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Cuenta_ahorro" (
    id_cuenta integer NOT NULL,
    id_socio integer,
    numero_cuenta character varying(20),
    saldo numeric(12,2) DEFAULT 0,
    fecha_apertura date,
    estado public.estado_cuenta DEFAULT 'activa'::public.estado_cuenta
);


ALTER TABLE public."Cuenta_ahorro" OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 16571)
-- Name: Cuenta_ahorro_id_cuenta_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Cuenta_ahorro_id_cuenta_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Cuenta_ahorro_id_cuenta_seq" OWNER TO postgres;

--
-- TOC entry 3971 (class 0 OID 0)
-- Dependencies: 228
-- Name: Cuenta_ahorro_id_cuenta_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Cuenta_ahorro_id_cuenta_seq" OWNED BY public."Cuenta_ahorro".id_cuenta;


--
-- TOC entry 232 (class 1259 OID 16607)
-- Name: Cuota; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Cuota" (
    id_cuota integer NOT NULL,
    id_prestamo integer,
    numero_cuota integer,
    montol_capital numeric(12,2),
    monto_interes numeric(12,2),
    monto_total numeric(12,2),
    fecha_vencimiento date,
    estado public.estado_cuota DEFAULT 'pendiente'::public.estado_cuota,
    mora_acumulada numeric(12,2) DEFAULT 0
);


ALTER TABLE public."Cuota" OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16606)
-- Name: Cuota_id_cuota_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Cuota_id_cuota_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Cuota_id_cuota_seq" OWNER TO postgres;

--
-- TOC entry 3972 (class 0 OID 0)
-- Dependencies: 231
-- Name: Cuota_id_cuota_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Cuota_id_cuota_seq" OWNED BY public."Cuota".id_cuota;


--
-- TOC entry 236 (class 1259 OID 16645)
-- Name: Movimiento_ahorro; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Movimiento_ahorro" (
    id_movimiento integer NOT NULL,
    id_cuenta integer,
    tipo public.tipo_movimiento,
    monto numeric(12,2),
    fecha timestamp without time zone,
    saldo_anterior numeric(12,2),
    saldo_posterior numeric(12,2),
    referencia character varying(50)
);


ALTER TABLE public."Movimiento_ahorro" OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 16644)
-- Name: Movimiento_ahorro_id_movimiento_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Movimiento_ahorro_id_movimiento_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Movimiento_ahorro_id_movimiento_seq" OWNER TO postgres;

--
-- TOC entry 3973 (class 0 OID 0)
-- Dependencies: 235
-- Name: Movimiento_ahorro_id_movimiento_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Movimiento_ahorro_id_movimiento_seq" OWNED BY public."Movimiento_ahorro".id_movimiento;


--
-- TOC entry 234 (class 1259 OID 16622)
-- Name: Pago; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Pago" (
    id_pago integer NOT NULL,
    id_cuota integer,
    id_prestamo integer,
    monto_pagado numeric(12,2),
    fecha_pago timestamp without time zone,
    metodo public.metodo_pago,
    referencia character varying(100),
    registrado_por integer
);


ALTER TABLE public."Pago" OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 16621)
-- Name: Pago_id_pago_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Pago_id_pago_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Pago_id_pago_seq" OWNER TO postgres;

--
-- TOC entry 3974 (class 0 OID 0)
-- Dependencies: 233
-- Name: Pago_id_pago_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Pago_id_pago_seq" OWNED BY public."Pago".id_pago;


--
-- TOC entry 230 (class 1259 OID 16587)
-- Name: Prestamo; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Prestamo" (
    id_prestamo integer NOT NULL,
    id_socio integer,
    monto numeric(12,2) NOT NULL,
    tasa_interes numeric(5,2),
    plazo_meses integer,
    estado public.estado_prestamo DEFAULT 'solicitado'::public.estado_prestamo,
    fecha_solicitud date,
    fecha_aprobacion date,
    aprobado_por integer
);


ALTER TABLE public."Prestamo" OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 16586)
-- Name: Prestamo_id_prestamo_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Prestamo_id_prestamo_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Prestamo_id_prestamo_seq" OWNER TO postgres;

--
-- TOC entry 3975 (class 0 OID 0)
-- Dependencies: 229
-- Name: Prestamo_id_prestamo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Prestamo_id_prestamo_seq" OWNED BY public."Prestamo".id_prestamo;


--
-- TOC entry 224 (class 1259 OID 16535)
-- Name: Reporte; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Reporte" (
    id_reporte integer NOT NULL,
    tipo public.tipo_reporte NOT NULL,
    fecha_inicio date,
    fecha_fin date,
    formato public.formato_reporte,
    generado_por integer,
    fecha_generacion timestamp with time zone,
    ruta_archivo character varying(255)
);


ALTER TABLE public."Reporte" OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16534)
-- Name: Reporte_id_reporte_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Reporte_id_reporte_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Reporte_id_reporte_seq" OWNER TO postgres;

--
-- TOC entry 3976 (class 0 OID 0)
-- Dependencies: 223
-- Name: Reporte_id_reporte_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Reporte_id_reporte_seq" OWNED BY public."Reporte".id_reporte;


--
-- TOC entry 220 (class 1259 OID 16498)
-- Name: Socio; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Socio" (
    id_socio integer NOT NULL,
    id_usuario integer,
    nombre character varying(100) NOT NULL,
    apellido character varying(100) NOT NULL,
    dni character varying(20) NOT NULL,
    email character varying(100),
    telefono character varying(20),
    direccion character varying(255),
    fecha_ingreso date,
    estado public.estado_socio DEFAULT 'activo'::public.estado_socio
);


ALTER TABLE public."Socio" OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 16510)
-- Name: Socio_id_socio_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Socio_id_socio_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Socio_id_socio_seq" OWNER TO postgres;

--
-- TOC entry 3977 (class 0 OID 0)
-- Dependencies: 222
-- Name: Socio_id_socio_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Socio_id_socio_seq" OWNED BY public."Socio".id_socio;


--
-- TOC entry 219 (class 1259 OID 16389)
-- Name: Usuario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Usuario" (
    id_usuario integer NOT NULL,
    username character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    email character varying(100),
    rol public.rol_usuario NOT NULL,
    sesion_activa boolean DEFAULT false,
    intentos_fallidos integer DEFAULT 0,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    estado public.estado_usuario DEFAULT 'activo'::public.estado_usuario
);


ALTER TABLE public."Usuario" OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16501)
-- Name: Usuario_id_usuario_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public."Usuario" ALTER COLUMN id_usuario ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."Usuario_id_usuario_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 3754 (class 2604 OID 16552)
-- Name: Aportacion id_aportacion; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Aportacion" ALTER COLUMN id_aportacion SET DEFAULT nextval('public."Aportacion_id_aportacion_seq"'::regclass);


--
-- TOC entry 3756 (class 2604 OID 16572)
-- Name: Cuenta_ahorro id_cuenta; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Cuenta_ahorro" ALTER COLUMN id_cuenta SET DEFAULT nextval('public."Cuenta_ahorro_id_cuenta_seq"'::regclass);


--
-- TOC entry 3761 (class 2604 OID 16610)
-- Name: Cuota id_cuota; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Cuota" ALTER COLUMN id_cuota SET DEFAULT nextval('public."Cuota_id_cuota_seq"'::regclass);


--
-- TOC entry 3765 (class 2604 OID 16648)
-- Name: Movimiento_ahorro id_movimiento; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Movimiento_ahorro" ALTER COLUMN id_movimiento SET DEFAULT nextval('public."Movimiento_ahorro_id_movimiento_seq"'::regclass);


--
-- TOC entry 3764 (class 2604 OID 16625)
-- Name: Pago id_pago; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Pago" ALTER COLUMN id_pago SET DEFAULT nextval('public."Pago_id_pago_seq"'::regclass);


--
-- TOC entry 3759 (class 2604 OID 16590)
-- Name: Prestamo id_prestamo; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Prestamo" ALTER COLUMN id_prestamo SET DEFAULT nextval('public."Prestamo_id_prestamo_seq"'::regclass);


--
-- TOC entry 3753 (class 2604 OID 16538)
-- Name: Reporte id_reporte; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Reporte" ALTER COLUMN id_reporte SET DEFAULT nextval('public."Reporte_id_reporte_seq"'::regclass);


--
-- TOC entry 3751 (class 2604 OID 16511)
-- Name: Socio id_socio; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Socio" ALTER COLUMN id_socio SET DEFAULT nextval('public."Socio_id_socio_seq"'::regclass);


--
-- TOC entry 3954 (class 0 OID 16549)
-- Dependencies: 226
-- Data for Name: Aportacion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Aportacion" (id_aportacion, id_socio, monto, fecha, tipo, estado, validado_por) FROM stdin;
4	2	75000.00	2026-05-06 00:00:00	cuota_mensual	validada	1
5	2	6000.00	2026-05-06 00:00:00	cuota_mensual	validada	1
6	5	70000.00	2026-05-06 00:00:00	ahorro	validada	1
7	8	25000000.00	2026-05-06 00:00:00	ahorro	validada	1
8	4	45000.00	2026-05-06 00:00:00	cuota_mensual	validada	1
\.


--
-- TOC entry 3955 (class 0 OID 16568)
-- Dependencies: 227
-- Data for Name: Cuenta_ahorro; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Cuenta_ahorro" (id_cuenta, id_socio, numero_cuenta, saldo, fecha_apertura, estado) FROM stdin;
1	1	AHO-2026-333	470000.00	2026-05-06	activa
2	8	AHO-2026-1453	3600000.00	2026-05-06	activa
\.


--
-- TOC entry 3960 (class 0 OID 16607)
-- Dependencies: 232
-- Data for Name: Cuota; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Cuota" (id_cuota, id_prestamo, numero_cuota, montol_capital, monto_interes, monto_total, fecha_vencimiento, estado, mora_acumulada) FROM stdin;
4	5	4	5978.93	7433.75	13412.68	2026-09-06	pendiente	0.00
5	5	5	6058.65	7354.03	13412.68	2026-10-06	pendiente	0.00
6	5	6	6139.43	7273.25	13412.68	2026-11-06	pendiente	0.00
7	5	7	6221.29	7191.39	13412.68	2026-12-06	pendiente	0.00
8	5	8	6304.24	7108.44	13412.68	2027-01-06	pendiente	0.00
9	5	9	6388.30	7024.38	13412.68	2027-02-06	pendiente	0.00
10	5	10	6473.47	6939.20	13412.68	2027-03-06	pendiente	0.00
11	5	11	6559.79	6852.89	13412.68	2027-04-06	pendiente	0.00
12	5	12	6647.25	6765.43	13412.68	2027-05-06	pendiente	0.00
13	5	13	6735.88	6676.80	13412.68	2027-06-06	pendiente	0.00
14	5	14	6825.69	6586.99	13412.68	2027-07-06	pendiente	0.00
15	5	15	6916.70	6495.98	13412.68	2027-08-06	pendiente	0.00
16	5	16	7008.92	6403.75	13412.68	2027-09-06	pendiente	0.00
17	5	17	7102.38	6310.30	13412.68	2027-10-06	pendiente	0.00
18	5	18	7197.07	6215.60	13412.68	2027-11-06	pendiente	0.00
19	5	19	7293.04	6119.64	13412.68	2027-12-06	pendiente	0.00
20	5	20	7390.28	6022.40	13412.68	2028-01-06	pendiente	0.00
21	5	21	7488.81	5923.86	13412.68	2028-02-06	pendiente	0.00
22	5	22	7588.66	5824.01	13412.68	2028-03-06	pendiente	0.00
23	5	23	7689.85	5722.83	13412.68	2028-04-06	pendiente	0.00
24	5	24	7792.38	5620.30	13412.68	2028-05-06	pendiente	0.00
25	5	25	7896.28	5516.40	13412.68	2028-06-06	pendiente	0.00
26	5	26	8001.56	5411.12	13412.68	2028-07-06	pendiente	0.00
27	5	27	8108.25	5304.43	13412.68	2028-08-06	pendiente	0.00
28	5	28	8216.36	5196.32	13412.68	2028-09-06	pendiente	0.00
29	5	29	8325.91	5086.77	13412.68	2028-10-06	pendiente	0.00
30	5	30	8436.92	4975.76	13412.68	2028-11-06	pendiente	0.00
31	5	31	8549.41	4863.26	13412.68	2028-12-06	pendiente	0.00
32	5	32	8663.41	4749.27	13412.68	2029-01-06	pendiente	0.00
33	5	33	8778.92	4633.76	13412.68	2029-02-06	pendiente	0.00
34	5	34	8895.97	4516.71	13412.68	2029-03-06	pendiente	0.00
35	5	35	9014.58	4398.09	13412.68	2029-04-06	pendiente	0.00
36	5	36	9134.78	4277.90	13412.68	2029-05-06	pendiente	0.00
37	5	37	9256.57	4156.10	13412.68	2029-06-06	pendiente	0.00
38	5	38	9379.99	4032.68	13412.68	2029-07-06	pendiente	0.00
39	5	39	9505.06	3907.62	13412.68	2029-08-06	pendiente	0.00
40	5	40	9631.80	3780.88	13412.68	2029-09-06	pendiente	0.00
41	5	41	9760.22	3652.46	13412.68	2029-10-06	pendiente	0.00
42	5	42	9890.36	3522.32	13412.68	2029-11-06	pendiente	0.00
43	5	43	10022.23	3390.45	13412.68	2029-12-06	pendiente	0.00
44	5	44	10155.86	3256.82	13412.68	2030-01-06	pendiente	0.00
45	5	45	10291.27	3121.41	13412.68	2030-02-06	pendiente	0.00
46	5	46	10428.49	2984.19	13412.68	2030-03-06	pendiente	0.00
47	5	47	10567.53	2845.15	13412.68	2030-04-06	pendiente	0.00
48	5	48	10708.43	2704.25	13412.68	2030-05-06	pendiente	0.00
49	5	49	10851.21	2561.47	13412.68	2030-06-06	pendiente	0.00
50	5	50	10995.89	2416.78	13412.68	2030-07-06	pendiente	0.00
51	5	51	11142.51	2270.17	13412.68	2030-08-06	pendiente	0.00
52	5	52	11291.07	2121.60	13412.68	2030-09-06	pendiente	0.00
53	5	53	11441.62	1971.06	13412.68	2030-10-06	pendiente	0.00
54	5	54	11594.18	1818.50	13412.68	2030-11-06	pendiente	0.00
55	5	55	11748.76	1663.91	13412.68	2030-12-06	pendiente	0.00
56	5	56	11905.41	1507.26	13412.68	2031-01-06	pendiente	0.00
57	5	57	12064.15	1348.52	13412.68	2031-02-06	pendiente	0.00
58	5	58	12225.01	1187.67	13412.68	2031-03-06	pendiente	0.00
59	5	59	12388.01	1024.67	13412.68	2031-04-06	pendiente	0.00
60	5	60	12553.18	859.50	13412.68	2031-05-06	pendiente	0.00
61	5	61	12720.56	692.12	13412.68	2031-06-06	pendiente	0.00
62	5	62	12890.17	522.51	13412.68	2031-07-06	pendiente	0.00
63	5	63	13062.03	350.64	13412.68	2031-08-06	pendiente	0.00
64	5	64	13236.19	176.48	13412.68	2031-09-06	pendiente	0.00
1	5	1	5746.01	7666.67	13412.68	2026-06-06	pagada	0.00
2	5	2	5822.62	7590.05	13412.68	2026-07-06	pagada	0.00
3	5	3	5900.26	7512.42	13412.68	2026-08-06	pagada	0.00
67	6	3	2809.48	173.51	2982.98	2026-08-06	pendiente	0.00
68	6	4	2816.50	166.48	2982.98	2026-09-06	pendiente	0.00
69	6	5	2823.54	159.44	2982.98	2026-10-06	pendiente	0.00
70	6	6	2830.60	152.38	2982.98	2026-11-06	pendiente	0.00
71	6	7	2837.68	145.30	2982.98	2026-12-06	pendiente	0.00
72	6	8	2844.77	138.21	2982.98	2027-01-06	pendiente	0.00
73	6	9	2851.89	131.10	2982.98	2027-02-06	pendiente	0.00
74	6	10	2859.01	123.97	2982.98	2027-03-06	pendiente	0.00
75	6	11	2866.16	116.82	2982.98	2027-04-06	pendiente	0.00
76	6	12	2873.33	109.66	2982.98	2027-05-06	pendiente	0.00
77	6	13	2880.51	102.47	2982.98	2027-06-06	pendiente	0.00
78	6	14	2887.71	95.27	2982.98	2027-07-06	pendiente	0.00
79	6	15	2894.93	88.05	2982.98	2027-08-06	pendiente	0.00
80	6	16	2902.17	80.81	2982.98	2027-09-06	pendiente	0.00
81	6	17	2909.42	73.56	2982.98	2027-10-06	pendiente	0.00
82	6	18	2916.70	66.29	2982.98	2027-11-06	pendiente	0.00
83	6	19	2923.99	58.99	2982.98	2027-12-06	pendiente	0.00
84	6	20	2931.30	51.68	2982.98	2028-01-06	pendiente	0.00
85	6	21	2938.63	44.36	2982.98	2028-02-06	pendiente	0.00
86	6	22	2945.97	37.01	2982.98	2028-03-06	pendiente	0.00
87	6	23	2953.34	29.64	2982.98	2028-04-06	pendiente	0.00
88	6	24	2960.72	22.26	2982.98	2028-05-06	pendiente	0.00
89	6	25	2968.12	14.86	2982.98	2028-06-06	pendiente	0.00
90	6	26	2975.55	7.44	2982.98	2028-07-06	pendiente	0.00
65	6	1	2795.48	187.50	2982.98	2026-06-06	pagada	0.00
66	6	2	2802.47	180.51	2982.98	2026-07-06	pagada	0.00
93	7	3	493.32	60.04	553.36	2026-08-06	pendiente	0.00
94	7	4	494.55	58.81	553.36	2026-09-06	pendiente	0.00
95	7	5	495.79	57.57	553.36	2026-10-06	pendiente	0.00
96	7	6	497.02	56.33	553.36	2026-11-06	pendiente	0.00
97	7	7	498.27	55.09	553.36	2026-12-06	pendiente	0.00
98	7	8	499.51	53.85	553.36	2027-01-06	pendiente	0.00
99	7	9	500.76	52.60	553.36	2027-02-06	pendiente	0.00
100	7	10	502.01	51.34	553.36	2027-03-06	pendiente	0.00
101	7	11	503.27	50.09	553.36	2027-04-06	pendiente	0.00
102	7	12	504.53	48.83	553.36	2027-05-06	pendiente	0.00
103	7	13	505.79	47.57	553.36	2027-06-06	pendiente	0.00
104	7	14	507.05	46.31	553.36	2027-07-06	pendiente	0.00
92	7	2	492.09	61.27	553.36	2026-07-06	pagada	0.00
105	7	15	508.32	45.04	553.36	2027-08-06	pendiente	0.00
106	7	16	509.59	43.77	553.36	2027-09-06	pendiente	0.00
107	7	17	510.86	42.49	553.36	2027-10-06	pendiente	0.00
108	7	18	512.14	41.22	553.36	2027-11-06	pendiente	0.00
109	7	19	513.42	39.94	553.36	2027-12-06	pendiente	0.00
110	7	20	514.71	38.65	553.36	2028-01-06	pendiente	0.00
111	7	21	515.99	37.37	553.36	2028-02-06	pendiente	0.00
112	7	22	517.28	36.08	553.36	2028-03-06	pendiente	0.00
113	7	23	518.58	34.78	553.36	2028-04-06	pendiente	0.00
114	7	24	519.87	33.49	553.36	2028-05-06	pendiente	0.00
115	7	25	521.17	32.19	553.36	2028-06-06	pendiente	0.00
116	7	26	522.48	30.88	553.36	2028-07-06	pendiente	0.00
117	7	27	523.78	29.58	553.36	2028-08-06	pendiente	0.00
118	7	28	525.09	28.27	553.36	2028-09-06	pendiente	0.00
119	7	29	526.40	26.95	553.36	2028-10-06	pendiente	0.00
120	7	30	527.72	25.64	553.36	2028-11-06	pendiente	0.00
121	7	31	529.04	24.32	553.36	2028-12-06	pendiente	0.00
122	7	32	530.36	23.00	553.36	2029-01-06	pendiente	0.00
123	7	33	531.69	21.67	553.36	2029-02-06	pendiente	0.00
124	7	34	533.02	20.34	553.36	2029-03-06	pendiente	0.00
125	7	35	534.35	19.01	553.36	2029-04-06	pendiente	0.00
126	7	36	535.68	17.67	553.36	2029-05-06	pendiente	0.00
127	7	37	537.02	16.33	553.36	2029-06-06	pendiente	0.00
128	7	38	538.37	14.99	553.36	2029-07-06	pendiente	0.00
129	7	39	539.71	13.65	553.36	2029-08-06	pendiente	0.00
130	7	40	541.06	12.30	553.36	2029-09-06	pendiente	0.00
131	7	41	542.41	10.94	553.36	2029-10-06	pendiente	0.00
132	7	42	543.77	9.59	553.36	2029-11-06	pendiente	0.00
133	7	43	545.13	8.23	553.36	2029-12-06	pendiente	0.00
134	7	44	546.49	6.87	553.36	2030-01-06	pendiente	0.00
135	7	45	547.86	5.50	553.36	2030-02-06	pendiente	0.00
136	7	46	549.23	4.13	553.36	2030-03-06	pendiente	0.00
137	7	47	550.60	2.76	553.36	2030-04-06	pendiente	0.00
138	7	48	551.98	1.38	553.36	2030-05-06	pendiente	0.00
91	7	1	490.86	62.50	553.36	2026-06-06	pagada	0.00
140	8	2	25122.62	8277.12	33399.75	2026-07-06	pendiente	0.00
141	8	3	25604.14	7795.60	33399.75	2026-08-06	pendiente	0.00
142	8	4	26094.89	7304.86	33399.75	2026-09-06	pendiente	0.00
143	8	5	26595.04	6804.71	33399.75	2026-10-06	pendiente	0.00
144	8	6	27104.78	6294.97	33399.75	2026-11-06	pendiente	0.00
145	8	7	27624.29	5775.46	33399.75	2026-12-06	pendiente	0.00
146	8	8	28153.75	5245.99	33399.75	2027-01-06	pendiente	0.00
147	8	9	28693.36	4706.38	33399.75	2027-02-06	pendiente	0.00
148	8	10	29243.32	4156.43	33399.75	2027-03-06	pendiente	0.00
149	8	11	29803.82	3595.93	33399.75	2027-04-06	pendiente	0.00
150	8	12	30375.06	3024.69	33399.75	2027-05-06	pendiente	0.00
151	8	13	30957.25	2442.50	33399.75	2027-06-06	pendiente	0.00
152	8	14	31550.59	1849.15	33399.75	2027-07-06	pendiente	0.00
153	8	15	32155.31	1244.43	33399.75	2027-08-06	pendiente	0.00
154	8	16	32771.62	628.12	33399.75	2027-09-06	pendiente	0.00
139	8	1	24650.16	8749.58	33399.75	2026-06-06	pagada	0.00
\.


--
-- TOC entry 3964 (class 0 OID 16645)
-- Dependencies: 236
-- Data for Name: Movimiento_ahorro; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Movimiento_ahorro" (id_movimiento, id_cuenta, tipo, monto, fecha, saldo_anterior, saldo_posterior, referencia) FROM stdin;
1	1	deposito	6000.00	2026-05-06 00:05:20.154984	450000.00	456000.00	Deposito prueba
2	1	retiro	4000.00	2026-05-06 00:06:48.285294	456000.00	452000.00	retiro prueba
3	1	deposito	18000.00	2026-05-06 00:07:07.735083	452000.00	470000.00	Aguinaldo
\.


--
-- TOC entry 3962 (class 0 OID 16622)
-- Dependencies: 234
-- Data for Name: Pago; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Pago" (id_pago, id_cuota, id_prestamo, monto_pagado, fecha_pago, metodo, referencia, registrado_por) FROM stdin;
1	1	5	13412.68	2026-05-06 00:00:00	efectivo	\N	1
2	2	5	13412.68	2026-05-06 00:00:00	efectivo	\N	1
3	3	5	13412.68	2026-05-06 00:00:00	efectivo	\N	1
4	65	6	2982.98	2026-05-08 00:00:00	efectivo	\N	1
5	66	6	2994.91	2026-07-11 00:00:00	efectivo	\N	1
6	91	7	553.36	2026-05-06 00:00:00	transferencia	\N	1
7	92	7	553.36	2026-05-06 00:00:00	cheque	\N	1
8	139	8	33399.75	2026-05-06 00:00:00	efectivo	\N	1
\.


--
-- TOC entry 3958 (class 0 OID 16587)
-- Dependencies: 230
-- Data for Name: Prestamo; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Prestamo" (id_prestamo, id_socio, monto, tasa_interes, plazo_meses, estado, fecha_solicitud, fecha_aprobacion, aprobado_por) FROM stdin;
5	2	575000.00	16.00	64	aprobado	2026-05-06	2026-05-06	1
6	6	75000.00	3.00	26	aprobado	2026-05-06	2026-05-06	1
7	8	25000.00	3.00	48	aprobado	2026-05-06	2026-05-06	1
8	4	456500.00	23.00	16	aprobado	2026-05-06	2026-05-06	1
\.


--
-- TOC entry 3952 (class 0 OID 16535)
-- Dependencies: 224
-- Data for Name: Reporte; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Reporte" (id_reporte, tipo, fecha_inicio, fecha_fin, formato, generado_por, fecha_generacion, ruta_archivo) FROM stdin;
1	socios	2026-05-01	2026-05-06	pdf	1	2026-05-06 00:36:21.008371-04	\N
2	socios	2026-05-01	2026-05-06	pantalla	1	2026-05-06 00:36:43.777675-04	\N
3	socios	2026-03-01	2026-05-06	pantalla	1	2026-05-06 00:37:39.556875-04	\N
4	prestamos	2026-05-01	2026-05-06	pantalla	1	2026-05-06 00:37:51.533227-04	\N
5	financiero	2020-10-01	2026-05-06	pantalla	1	2026-05-06 00:43:46.321485-04	\N
6	prestamos	2020-10-01	2026-05-06	pantalla	1	2026-05-06 00:44:07.542989-04	\N
7	socios	2020-10-01	2026-05-06	pantalla	1	2026-05-06 00:44:23.126358-04	\N
8	aportaciones	2020-10-01	2026-05-06	pantalla	1	2026-05-06 00:44:32.383971-04	\N
9	socios	2020-01-01	2026-05-06	pdf	1	2026-05-06 00:51:29.520428-04	\N
10	socios	2020-01-01	2026-05-06	pantalla	1	2026-05-06 00:52:37.55307-04	\N
11	financiero	2020-01-01	2026-05-06	pantalla	1	2026-05-06 00:53:08.833874-04	\N
12	financiero	2026-05-01	2026-05-06	pantalla	1	2026-05-06 00:53:15.549488-04	\N
13	financiero	2026-05-01	2026-05-06	pantalla	1	2026-05-06 00:56:56.295023-04	\N
14	financiero	2020-02-01	2026-05-06	pdf	1	2026-05-06 01:01:38.249171-04	\N
15	socios	2026-05-01	2026-05-06	pantalla	1	2026-05-06 01:02:08.432646-04	\N
16	socios	2026-05-01	2026-05-06	pantalla	1	2026-05-06 01:02:20.102716-04	\N
17	socios	2020-01-01	2026-05-06	pantalla	1	2026-05-06 01:02:42.798698-04	\N
18	socios	2020-01-01	2026-05-06	pantalla	1	2026-05-06 01:58:26.009996-04	\N
\.


--
-- TOC entry 3948 (class 0 OID 16498)
-- Dependencies: 220
-- Data for Name: Socio; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Socio" (id_socio, id_usuario, nombre, apellido, dni, email, telefono, direccion, fecha_ingreso, estado) FROM stdin;
1	1	Juan	Pérez	402-1234567-8	juan.perez@email.com	809-555-0101	Calle 2, Barahona	2024-01-15	activo
3	1	Pedro	Rodríguez	402-1112233-4	pedro.rodriguez@email.com	809-555-0303	Av. Duarte, Barahona	2024-03-10	suspendido
4	1	Pedro Suniel	Santana Mella	001-1234567-1	santana61@gmail.com	829-781-1861	Av. Duarte, Santiago	2024-07-04	inactivo
2	1	María	García	402-7654321-0	maria.garcia@email.com	809-555-0234	Calle 2 #45, Barahona	2023-12-06	activo
5	1	Ramon	Caceres	001-2349871-2	rmaon1911@hotmail.com	8496670102	Calle 3 #2, Santo Domingo	2025-06-23	activo
6	1	Maceta	Grullon	403-4567890-2	macestarlin@yahoo.com	787-567-0012	Calle 52, San Pedro	2026-02-02	activo
7	2	Manuel	Perez	202-4567129-3	perez.manuel12@yahoo.com	809-455-8890	Calle Menor, Pedro Brand	2024-07-03	activo
8	1	Juan	Nikephoros	001-1844272-1	greek.soldier@gmail.com	8096661453	Calle 1, San Juan	2026-05-06	activo
\.


--
-- TOC entry 3947 (class 0 OID 16389)
-- Dependencies: 219
-- Data for Name: Usuario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Usuario" (id_usuario, username, password_hash, email, rol, sesion_activa, intentos_fallidos, fecha_creacion, estado) FROM stdin;
1	Carlos	admin123	carlos@coop.com	admin	f	0	2026-04-11 10:25:13.229543-04	activo
2	Roberto	admin123	roberto@coop.com	admin	f	0	2026-04-11 10:53:21.41125-04	activo
3	Reymi	admin123	reymi@coop.com	admin	f	0	2026-04-11 10:53:21.41125-04	activo
4	Melany	admin123	melany@coop.com	admin	f	0	2026-04-11 10:53:21.41125-04	activo
\.


--
-- TOC entry 3978 (class 0 OID 0)
-- Dependencies: 225
-- Name: Aportacion_id_aportacion_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Aportacion_id_aportacion_seq"', 8, true);


--
-- TOC entry 3979 (class 0 OID 0)
-- Dependencies: 228
-- Name: Cuenta_ahorro_id_cuenta_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Cuenta_ahorro_id_cuenta_seq"', 2, true);


--
-- TOC entry 3980 (class 0 OID 0)
-- Dependencies: 231
-- Name: Cuota_id_cuota_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Cuota_id_cuota_seq"', 154, true);


--
-- TOC entry 3981 (class 0 OID 0)
-- Dependencies: 235
-- Name: Movimiento_ahorro_id_movimiento_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Movimiento_ahorro_id_movimiento_seq"', 3, true);


--
-- TOC entry 3982 (class 0 OID 0)
-- Dependencies: 233
-- Name: Pago_id_pago_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Pago_id_pago_seq"', 8, true);


--
-- TOC entry 3983 (class 0 OID 0)
-- Dependencies: 229
-- Name: Prestamo_id_prestamo_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Prestamo_id_prestamo_seq"', 8, true);


--
-- TOC entry 3984 (class 0 OID 0)
-- Dependencies: 223
-- Name: Reporte_id_reporte_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Reporte_id_reporte_seq"', 18, true);


--
-- TOC entry 3985 (class 0 OID 0)
-- Dependencies: 222
-- Name: Socio_id_socio_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Socio_id_socio_seq"', 8, true);


--
-- TOC entry 3986 (class 0 OID 0)
-- Dependencies: 221
-- Name: Usuario_id_usuario_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Usuario_id_usuario_seq"', 4, true);


--
-- TOC entry 3774 (class 2606 OID 16557)
-- Name: Aportacion Aportacion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Aportacion"
    ADD CONSTRAINT "Aportacion_pkey" PRIMARY KEY (id_aportacion);


--
-- TOC entry 3777 (class 2606 OID 16579)
-- Name: Cuenta_ahorro Cuenta_ahorro_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Cuenta_ahorro"
    ADD CONSTRAINT "Cuenta_ahorro_pkey" PRIMARY KEY (id_cuenta);


--
-- TOC entry 3782 (class 2606 OID 16615)
-- Name: Cuota Cuota_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Cuota"
    ADD CONSTRAINT "Cuota_pkey" PRIMARY KEY (id_cuota);


--
-- TOC entry 3786 (class 2606 OID 16651)
-- Name: Movimiento_ahorro Movimiento_ahorro_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Movimiento_ahorro"
    ADD CONSTRAINT "Movimiento_ahorro_pkey" PRIMARY KEY (id_movimiento);


--
-- TOC entry 3784 (class 2606 OID 16628)
-- Name: Pago Pago_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Pago"
    ADD CONSTRAINT "Pago_pkey" PRIMARY KEY (id_pago);


--
-- TOC entry 3779 (class 2606 OID 16595)
-- Name: Prestamo Prestamo_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Prestamo"
    ADD CONSTRAINT "Prestamo_pkey" PRIMARY KEY (id_prestamo);


--
-- TOC entry 3772 (class 2606 OID 16542)
-- Name: Reporte Reporte_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Reporte"
    ADD CONSTRAINT "Reporte_pkey" PRIMARY KEY (id_reporte);


--
-- TOC entry 3769 (class 2606 OID 16517)
-- Name: Socio Socio_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Socio"
    ADD CONSTRAINT "Socio_pkey" PRIMARY KEY (id_socio);


--
-- TOC entry 3767 (class 2606 OID 16396)
-- Name: Usuario Usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Usuario"
    ADD CONSTRAINT "Usuario_pkey" PRIMARY KEY (id_usuario);


--
-- TOC entry 3775 (class 1259 OID 16658)
-- Name: idx_aportacion_socio; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_aportacion_socio ON public."Aportacion" USING btree (id_socio);


--
-- TOC entry 3780 (class 1259 OID 16659)
-- Name: idx_prestamo_socio; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prestamo_socio ON public."Prestamo" USING btree (id_socio);


--
-- TOC entry 3770 (class 1259 OID 16657)
-- Name: idx_socio_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_socio_usuario ON public."Socio" USING btree (id_usuario);


--
-- TOC entry 3799 (class 2620 OID 16661)
-- Name: Movimiento_ahorro trigger_actualizar_saldo; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_actualizar_saldo AFTER INSERT ON public."Movimiento_ahorro" FOR EACH ROW EXECUTE FUNCTION public.actualizar_saldo();


--
-- TOC entry 3794 (class 2606 OID 16616)
-- Name: Cuota Cuota_id_prestamo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Cuota"
    ADD CONSTRAINT "Cuota_id_prestamo_fkey" FOREIGN KEY (id_prestamo) REFERENCES public."Prestamo"(id_prestamo) NOT VALID;


--
-- TOC entry 3789 (class 2606 OID 16558)
-- Name: Aportacion aportacion_id_socio_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Aportacion"
    ADD CONSTRAINT aportacion_id_socio_fkey FOREIGN KEY (id_socio) REFERENCES public."Socio"(id_socio) NOT VALID;


--
-- TOC entry 3790 (class 2606 OID 16563)
-- Name: Aportacion aportacion_validado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Aportacion"
    ADD CONSTRAINT aportacion_validado_por_fkey FOREIGN KEY (validado_por) REFERENCES public."Usuario"(id_usuario) NOT VALID;


--
-- TOC entry 3791 (class 2606 OID 16581)
-- Name: Cuenta_ahorro cuenta_ahorro_id_socio_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Cuenta_ahorro"
    ADD CONSTRAINT cuenta_ahorro_id_socio_fkey FOREIGN KEY (id_socio) REFERENCES public."Socio"(id_socio) NOT VALID;


--
-- TOC entry 3798 (class 2606 OID 16652)
-- Name: Movimiento_ahorro movimiento_ahorro_id_cuenta_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Movimiento_ahorro"
    ADD CONSTRAINT movimiento_ahorro_id_cuenta_fkey FOREIGN KEY (id_cuenta) REFERENCES public."Cuenta_ahorro"(id_cuenta) NOT VALID;


--
-- TOC entry 3795 (class 2606 OID 16629)
-- Name: Pago pago_id_cuota_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Pago"
    ADD CONSTRAINT pago_id_cuota_fkey FOREIGN KEY (id_cuota) REFERENCES public."Cuota"(id_cuota) NOT VALID;


--
-- TOC entry 3796 (class 2606 OID 16634)
-- Name: Pago pago_id_prestamo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Pago"
    ADD CONSTRAINT pago_id_prestamo_fkey FOREIGN KEY (id_prestamo) REFERENCES public."Prestamo"(id_prestamo) NOT VALID;


--
-- TOC entry 3797 (class 2606 OID 16639)
-- Name: Pago pago_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Pago"
    ADD CONSTRAINT pago_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public."Usuario"(id_usuario) NOT VALID;


--
-- TOC entry 3792 (class 2606 OID 16601)
-- Name: Prestamo prestamo_aprobado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Prestamo"
    ADD CONSTRAINT prestamo_aprobado_por_fkey FOREIGN KEY (aprobado_por) REFERENCES public."Usuario"(id_usuario) NOT VALID;


--
-- TOC entry 3793 (class 2606 OID 16596)
-- Name: Prestamo prestamo_id_socio_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Prestamo"
    ADD CONSTRAINT prestamo_id_socio_fkey FOREIGN KEY (id_socio) REFERENCES public."Socio"(id_socio) NOT VALID;


--
-- TOC entry 3788 (class 2606 OID 16543)
-- Name: Reporte reporte_generado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Reporte"
    ADD CONSTRAINT reporte_generado_por_fkey FOREIGN KEY (generado_por) REFERENCES public."Usuario"(id_usuario) NOT VALID;


--
-- TOC entry 3787 (class 2606 OID 16518)
-- Name: Socio socio_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Socio"
    ADD CONSTRAINT socio_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public."Usuario"(id_usuario) ON DELETE RESTRICT NOT VALID;


-- Completed on 2026-05-06 19:35:20 AST

--
-- PostgreSQL database dump complete
--

\unrestrict qnziHh7hByiolHg2VBKneayynKwM2wgWcSKYGiobYGY4td50iqsRnCDb0Mi3O86

