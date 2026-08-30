--
-- PostgreSQL database dump
--

\restrict 21NvpHVT7M7lHGCUC5Opb48kJSeSm9fMaHVPcoS5Srrzqd4fMlRJ2rrlDNTCEhh

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

--
-- Name: create_user_currency(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_user_currency() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO user_currency (account_id, gems) VALUES (NEW.id, 0);
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(24) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(128) NOT NULL,
    password_salt character varying(32) NOT NULL,
    elo integer DEFAULT 0,
    games integer DEFAULT 0,
    wins integer DEFAULT 0,
    draws integer DEFAULT 0,
    losses integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    role character varying(20) DEFAULT 'user'::character varying
);


--
-- Name: achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.achievements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    category character varying(30),
    requirement_type character varying(30),
    requirement_value integer,
    gems_reward integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    elo_reward integer DEFAULT 0
);


--
-- Name: animated_board_themes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.animated_board_themes (
    id integer NOT NULL,
    name text NOT NULL,
    css_class text NOT NULL,
    animation_css text NOT NULL,
    light_sq text DEFAULT '#f0d9b5'::text NOT NULL,
    dark_sq text DEFAULT '#b58863'::text NOT NULL,
    cost_elo integer DEFAULT 0 NOT NULL
);


--
-- Name: animated_board_themes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.animated_board_themes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: animated_board_themes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.animated_board_themes_id_seq OWNED BY public.animated_board_themes.id;


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    announcement_id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    category character varying(100) DEFAULT 'General'::character varying,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    image_url character varying(500),
    event_date character varying(100),
    prize_pool character varying(100),
    button_label character varying(100),
    button_link character varying(500)
);


--
-- Name: chess_quiz_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chess_quiz_questions (
    id integer NOT NULL,
    question text NOT NULL,
    option_a text NOT NULL,
    option_b text NOT NULL,
    option_c text NOT NULL,
    option_d text NOT NULL,
    correct_option character(1) NOT NULL,
    category text DEFAULT 'general'::text,
    CONSTRAINT chess_quiz_questions_correct_option_check CHECK ((correct_option = ANY (ARRAY['a'::bpchar, 'b'::bpchar, 'c'::bpchar, 'd'::bpchar])))
);


--
-- Name: chess_quiz_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chess_quiz_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chess_quiz_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chess_quiz_questions_id_seq OWNED BY public.chess_quiz_questions.id;


--
-- Name: daily_calendar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_calendar (
    id integer NOT NULL,
    day_number integer NOT NULL,
    reward_type text NOT NULL,
    reward_amount integer NOT NULL,
    description text NOT NULL
);


--
-- Name: daily_calendar_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.daily_calendar_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: daily_calendar_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.daily_calendar_id_seq OWNED BY public.daily_calendar.id;


--
-- Name: daily_puzzles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_puzzles (
    id integer NOT NULL,
    puzzle_date date NOT NULL,
    fen character varying(200) NOT NULL,
    solution_moves text[] NOT NULL,
    difficulty character varying(20) DEFAULT 'medium'::character varying,
    description text,
    hint text,
    reward_elo integer DEFAULT 5,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: daily_puzzles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.daily_puzzles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: daily_puzzles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.daily_puzzles_id_seq OWNED BY public.daily_puzzles.id;


--
-- Name: emoji_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emoji_reactions (
    id integer NOT NULL,
    emoji text NOT NULL,
    name text NOT NULL,
    cost_elo integer DEFAULT 0 NOT NULL
);


--
-- Name: emoji_reactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.emoji_reactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: emoji_reactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.emoji_reactions_id_seq OWNED BY public.emoji_reactions.id;


--
-- Name: game_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.game_reactions (
    id integer NOT NULL,
    game_room_id text NOT NULL,
    sender_id uuid NOT NULL,
    receiver_id uuid,
    emoji text NOT NULL,
    sent_at timestamp with time zone DEFAULT now()
);


--
-- Name: game_reactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.game_reactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: game_reactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.game_reactions_id_seq OWNED BY public.game_reactions.id;


--
-- Name: games; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.games (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id character varying(6) NOT NULL,
    white_player_id uuid,
    black_player_id uuid,
    white_username character varying(24),
    black_username character varying(24),
    moves jsonb DEFAULT '[]'::jsonb,
    result character varying(10),
    result_type character varying(20),
    winner character varying(24),
    started_at timestamp without time zone,
    finished_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory (
    id integer NOT NULL,
    account_id integer NOT NULL,
    item_id integer NOT NULL,
    is_equipped boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: inventory_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_id_seq OWNED BY public.inventory.id;


--
-- Name: lobbies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lobbies (
    id integer NOT NULL,
    room_id character varying(6) NOT NULL,
    host_id integer NOT NULL,
    host_name character varying(255) NOT NULL,
    player2_id integer,
    status character varying(20) DEFAULT 'waiting'::character varying,
    player_count integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: lobbies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lobbies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lobbies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lobbies_id_seq OWNED BY public.lobbies.id;


--
-- Name: loot_box_rewards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loot_box_rewards (
    id integer NOT NULL,
    loot_box_id integer NOT NULL,
    reward_type text NOT NULL,
    reward_name text NOT NULL,
    reward_value integer DEFAULT 1 NOT NULL,
    rarity text DEFAULT 'common'::text NOT NULL,
    drop_chance numeric(5,2) DEFAULT 25.00 NOT NULL
);


--
-- Name: loot_box_rewards_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.loot_box_rewards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: loot_box_rewards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.loot_box_rewards_id_seq OWNED BY public.loot_box_rewards.id;


--
-- Name: loot_boxes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loot_boxes (
    id integer NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    rarity text DEFAULT 'common'::text NOT NULL,
    cost_elo integer NOT NULL,
    icon text DEFAULT '📦'::text
);


--
-- Name: loot_boxes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.loot_boxes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: loot_boxes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.loot_boxes_id_seq OWNED BY public.loot_boxes.id;


--
-- Name: music_albums; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.music_albums (
    id integer NOT NULL,
    title character varying(100) NOT NULL,
    artist character varying(100),
    cover_image text,
    audio_file text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    category character varying(200)
);


--
-- Name: music_albums_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.music_albums_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: music_albums_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.music_albums_id_seq OWNED BY public.music_albums.id;


--
-- Name: player_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid,
    type character varying(30) NOT NULL,
    title character varying(100) NOT NULL,
    message text,
    data jsonb,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: profile_themes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profile_themes (
    id integer NOT NULL,
    name text NOT NULL,
    css_class text NOT NULL,
    gradient text NOT NULL,
    preview_url text,
    cost_elo integer DEFAULT 0 NOT NULL
);


--
-- Name: profile_themes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.profile_themes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: profile_themes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.profile_themes_id_seq OWNED BY public.profile_themes.id;


--
-- Name: puzzle_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.puzzle_attempts (
    id integer NOT NULL,
    account_id uuid,
    puzzle_id integer,
    solved boolean DEFAULT false,
    attempts integer DEFAULT 0,
    solved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: puzzle_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.puzzle_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: puzzle_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.puzzle_attempts_id_seq OWNED BY public.puzzle_attempts.id;


--
-- Name: quests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quests (
    id integer NOT NULL,
    quest_type character varying(50) NOT NULL,
    quest_name character varying(100) NOT NULL,
    description text,
    goal integer DEFAULT 1,
    reward_elo integer DEFAULT 50,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: quests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quests_id_seq OWNED BY public.quests.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    token character varying(64) NOT NULL,
    account_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone DEFAULT (CURRENT_TIMESTAMP + '7 days'::interval)
);


--
-- Name: shop_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shop_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    category character varying(30) NOT NULL,
    price integer NOT NULL,
    rarity character varying(20) DEFAULT 'common'::character varying,
    preview_data jsonb,
    is_limited boolean DEFAULT false,
    limited_until timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: tournament_duels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tournament_duels (
    id integer NOT NULL,
    tournament_id integer NOT NULL,
    challenger_id uuid NOT NULL,
    opponent_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    result text,
    winner_id uuid,
    game_id integer,
    created_at timestamp with time zone DEFAULT now(),
    room_id character varying(6)
);


--
-- Name: tournament_duels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tournament_duels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tournament_duels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tournament_duels_id_seq OWNED BY public.tournament_duels.id;


--
-- Name: tournament_players; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tournament_players (
    id integer NOT NULL,
    tournament_id integer NOT NULL,
    account_id uuid NOT NULL,
    points integer DEFAULT 0 NOT NULL,
    games_played integer DEFAULT 0 NOT NULL,
    joined_at timestamp with time zone DEFAULT now()
);


--
-- Name: tournament_players_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tournament_players_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tournament_players_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tournament_players_id_seq OWNED BY public.tournament_players.id;


--
-- Name: tournaments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tournaments (
    id integer NOT NULL,
    creator_id uuid NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text,
    max_players integer DEFAULT 10 NOT NULL,
    points_per_win integer DEFAULT 10 NOT NULL,
    entry_cost integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'waiting'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    disconnect_elo integer DEFAULT 0 NOT NULL
);


--
-- Name: tournaments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tournaments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tournaments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tournaments_id_seq OWNED BY public.tournaments.id;


--
-- Name: user_achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_achievements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid,
    achievement_id uuid,
    unlocked_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    claimed boolean DEFAULT false
);


--
-- Name: user_board_theme; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_board_theme (
    account_id uuid NOT NULL,
    board_theme_id integer
);


--
-- Name: user_calendar_claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_calendar_claims (
    id integer NOT NULL,
    account_id uuid NOT NULL,
    claim_date date DEFAULT CURRENT_DATE NOT NULL,
    reward_type text NOT NULL,
    reward_amount integer NOT NULL
);


--
-- Name: user_calendar_claims_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_calendar_claims_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_calendar_claims_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_calendar_claims_id_seq OWNED BY public.user_calendar_claims.id;


--
-- Name: user_currency; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_currency (
    account_id uuid NOT NULL,
    gems integer DEFAULT 0,
    total_gems_earned integer DEFAULT 0,
    total_gems_spent integer DEFAULT 0,
    last_daily_login timestamp without time zone,
    login_streak integer DEFAULT 0,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_emoji_inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_emoji_inventory (
    id integer NOT NULL,
    account_id uuid NOT NULL,
    emoji_id integer NOT NULL
);


--
-- Name: user_emoji_inventory_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_emoji_inventory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_emoji_inventory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_emoji_inventory_id_seq OWNED BY public.user_emoji_inventory.id;


--
-- Name: user_inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid,
    item_id uuid,
    purchased_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_equipped boolean DEFAULT false,
    equipped_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_loot_boxes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_loot_boxes (
    id integer NOT NULL,
    account_id uuid NOT NULL,
    loot_box_id integer NOT NULL,
    opened boolean DEFAULT false,
    reward_type text,
    reward_name text,
    reward_value integer,
    opened_at timestamp with time zone,
    received_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_loot_boxes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_loot_boxes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_loot_boxes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_loot_boxes_id_seq OWNED BY public.user_loot_boxes.id;


--
-- Name: user_music_selection; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_music_selection (
    account_id uuid NOT NULL,
    album_id integer
);


--
-- Name: user_profile_theme; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profile_theme (
    account_id uuid NOT NULL,
    theme_id integer,
    banner_id integer
);


--
-- Name: user_quests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_quests (
    id integer NOT NULL,
    user_id uuid,
    quest_id integer,
    progress integer DEFAULT 0,
    completed boolean DEFAULT false,
    claimed boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_quests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_quests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_quests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_quests_id_seq OWNED BY public.user_quests.id;


--
-- Name: animated_board_themes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.animated_board_themes ALTER COLUMN id SET DEFAULT nextval('public.animated_board_themes_id_seq'::regclass);


--
-- Name: chess_quiz_questions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chess_quiz_questions ALTER COLUMN id SET DEFAULT nextval('public.chess_quiz_questions_id_seq'::regclass);


--
-- Name: daily_calendar id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_calendar ALTER COLUMN id SET DEFAULT nextval('public.daily_calendar_id_seq'::regclass);


--
-- Name: daily_puzzles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_puzzles ALTER COLUMN id SET DEFAULT nextval('public.daily_puzzles_id_seq'::regclass);


--
-- Name: emoji_reactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emoji_reactions ALTER COLUMN id SET DEFAULT nextval('public.emoji_reactions_id_seq'::regclass);


--
-- Name: game_reactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_reactions ALTER COLUMN id SET DEFAULT nextval('public.game_reactions_id_seq'::regclass);


--
-- Name: inventory id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory ALTER COLUMN id SET DEFAULT nextval('public.inventory_id_seq'::regclass);


--
-- Name: lobbies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lobbies ALTER COLUMN id SET DEFAULT nextval('public.lobbies_id_seq'::regclass);


--
-- Name: loot_box_rewards id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loot_box_rewards ALTER COLUMN id SET DEFAULT nextval('public.loot_box_rewards_id_seq'::regclass);


--
-- Name: loot_boxes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loot_boxes ALTER COLUMN id SET DEFAULT nextval('public.loot_boxes_id_seq'::regclass);


--
-- Name: music_albums id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_albums ALTER COLUMN id SET DEFAULT nextval('public.music_albums_id_seq'::regclass);


--
-- Name: profile_themes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_themes ALTER COLUMN id SET DEFAULT nextval('public.profile_themes_id_seq'::regclass);


--
-- Name: puzzle_attempts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.puzzle_attempts ALTER COLUMN id SET DEFAULT nextval('public.puzzle_attempts_id_seq'::regclass);


--
-- Name: quests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quests ALTER COLUMN id SET DEFAULT nextval('public.quests_id_seq'::regclass);


--
-- Name: tournament_duels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_duels ALTER COLUMN id SET DEFAULT nextval('public.tournament_duels_id_seq'::regclass);


--
-- Name: tournament_players id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_players ALTER COLUMN id SET DEFAULT nextval('public.tournament_players_id_seq'::regclass);


--
-- Name: tournaments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournaments ALTER COLUMN id SET DEFAULT nextval('public.tournaments_id_seq'::regclass);


--
-- Name: user_calendar_claims id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_calendar_claims ALTER COLUMN id SET DEFAULT nextval('public.user_calendar_claims_id_seq'::regclass);


--
-- Name: user_emoji_inventory id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_emoji_inventory ALTER COLUMN id SET DEFAULT nextval('public.user_emoji_inventory_id_seq'::regclass);


--
-- Name: user_loot_boxes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_loot_boxes ALTER COLUMN id SET DEFAULT nextval('public.user_loot_boxes_id_seq'::regclass);


--
-- Name: user_quests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_quests ALTER COLUMN id SET DEFAULT nextval('public.user_quests_id_seq'::regclass);


--
-- Name: accounts accounts_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_email_key UNIQUE (email);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_username_key UNIQUE (username);


--
-- Name: achievements achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_pkey PRIMARY KEY (id);


--
-- Name: animated_board_themes animated_board_themes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.animated_board_themes
    ADD CONSTRAINT animated_board_themes_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (announcement_id);


--
-- Name: chess_quiz_questions chess_quiz_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chess_quiz_questions
    ADD CONSTRAINT chess_quiz_questions_pkey PRIMARY KEY (id);


--
-- Name: daily_calendar daily_calendar_day_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_calendar
    ADD CONSTRAINT daily_calendar_day_number_key UNIQUE (day_number);


--
-- Name: daily_calendar daily_calendar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_calendar
    ADD CONSTRAINT daily_calendar_pkey PRIMARY KEY (id);


--
-- Name: daily_puzzles daily_puzzles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_puzzles
    ADD CONSTRAINT daily_puzzles_pkey PRIMARY KEY (id);


--
-- Name: daily_puzzles daily_puzzles_puzzle_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_puzzles
    ADD CONSTRAINT daily_puzzles_puzzle_date_key UNIQUE (puzzle_date);


--
-- Name: emoji_reactions emoji_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emoji_reactions
    ADD CONSTRAINT emoji_reactions_pkey PRIMARY KEY (id);


--
-- Name: game_reactions game_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_reactions
    ADD CONSTRAINT game_reactions_pkey PRIMARY KEY (id);


--
-- Name: games games_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- Name: lobbies lobbies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lobbies
    ADD CONSTRAINT lobbies_pkey PRIMARY KEY (id);


--
-- Name: lobbies lobbies_room_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lobbies
    ADD CONSTRAINT lobbies_room_id_key UNIQUE (room_id);


--
-- Name: loot_box_rewards loot_box_rewards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loot_box_rewards
    ADD CONSTRAINT loot_box_rewards_pkey PRIMARY KEY (id);


--
-- Name: loot_boxes loot_boxes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loot_boxes
    ADD CONSTRAINT loot_boxes_pkey PRIMARY KEY (id);


--
-- Name: music_albums music_albums_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_albums
    ADD CONSTRAINT music_albums_pkey PRIMARY KEY (id);


--
-- Name: player_notifications player_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_notifications
    ADD CONSTRAINT player_notifications_pkey PRIMARY KEY (id);


--
-- Name: profile_themes profile_themes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_themes
    ADD CONSTRAINT profile_themes_pkey PRIMARY KEY (id);


--
-- Name: puzzle_attempts puzzle_attempts_account_id_puzzle_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.puzzle_attempts
    ADD CONSTRAINT puzzle_attempts_account_id_puzzle_id_key UNIQUE (account_id, puzzle_id);


--
-- Name: puzzle_attempts puzzle_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.puzzle_attempts
    ADD CONSTRAINT puzzle_attempts_pkey PRIMARY KEY (id);


--
-- Name: quests quests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quests
    ADD CONSTRAINT quests_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (token);


--
-- Name: shop_items shop_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_items
    ADD CONSTRAINT shop_items_pkey PRIMARY KEY (id);


--
-- Name: tournament_duels tournament_duels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_duels
    ADD CONSTRAINT tournament_duels_pkey PRIMARY KEY (id);


--
-- Name: tournament_players tournament_players_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_players
    ADD CONSTRAINT tournament_players_pkey PRIMARY KEY (id);


--
-- Name: tournament_players tournament_players_tournament_id_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_players
    ADD CONSTRAINT tournament_players_tournament_id_account_id_key UNIQUE (tournament_id, account_id);


--
-- Name: tournaments tournaments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_pkey PRIMARY KEY (id);


--
-- Name: user_achievements user_achievements_account_id_achievement_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_account_id_achievement_id_key UNIQUE (account_id, achievement_id);


--
-- Name: user_achievements user_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (id);


--
-- Name: user_board_theme user_board_theme_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_board_theme
    ADD CONSTRAINT user_board_theme_pkey PRIMARY KEY (account_id);


--
-- Name: user_calendar_claims user_calendar_claims_account_id_claim_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_calendar_claims
    ADD CONSTRAINT user_calendar_claims_account_id_claim_date_key UNIQUE (account_id, claim_date);


--
-- Name: user_calendar_claims user_calendar_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_calendar_claims
    ADD CONSTRAINT user_calendar_claims_pkey PRIMARY KEY (id);


--
-- Name: user_currency user_currency_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_currency
    ADD CONSTRAINT user_currency_pkey PRIMARY KEY (account_id);


--
-- Name: user_emoji_inventory user_emoji_inventory_account_id_emoji_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_emoji_inventory
    ADD CONSTRAINT user_emoji_inventory_account_id_emoji_id_key UNIQUE (account_id, emoji_id);


--
-- Name: user_emoji_inventory user_emoji_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_emoji_inventory
    ADD CONSTRAINT user_emoji_inventory_pkey PRIMARY KEY (id);


--
-- Name: user_inventory user_inventory_account_id_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_inventory
    ADD CONSTRAINT user_inventory_account_id_item_id_key UNIQUE (account_id, item_id);


--
-- Name: user_inventory user_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_inventory
    ADD CONSTRAINT user_inventory_pkey PRIMARY KEY (id);


--
-- Name: user_loot_boxes user_loot_boxes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_loot_boxes
    ADD CONSTRAINT user_loot_boxes_pkey PRIMARY KEY (id);


--
-- Name: user_music_selection user_music_selection_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_music_selection
    ADD CONSTRAINT user_music_selection_pkey PRIMARY KEY (account_id);


--
-- Name: user_profile_theme user_profile_theme_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profile_theme
    ADD CONSTRAINT user_profile_theme_pkey PRIMARY KEY (account_id);


--
-- Name: user_quests user_quests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_quests
    ADD CONSTRAINT user_quests_pkey PRIMARY KEY (id);


--
-- Name: user_quests user_quests_user_id_quest_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_quests
    ADD CONSTRAINT user_quests_user_id_quest_id_key UNIQUE (user_id, quest_id);


--
-- Name: idx_accounts_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounts_email ON public.accounts USING btree (email);


--
-- Name: idx_accounts_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounts_username ON public.accounts USING btree (username);


--
-- Name: idx_games_black_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_games_black_player ON public.games USING btree (black_player_id);


--
-- Name: idx_games_room_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_games_room_id ON public.games USING btree (room_id);


--
-- Name: idx_games_white_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_games_white_player ON public.games USING btree (white_player_id);


--
-- Name: idx_notifications_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_account ON public.player_notifications USING btree (account_id);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_unread ON public.player_notifications USING btree (account_id, is_read);


--
-- Name: idx_puzzle_attempts_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_puzzle_attempts_account ON public.puzzle_attempts USING btree (account_id);


--
-- Name: idx_puzzle_attempts_puzzle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_puzzle_attempts_puzzle ON public.puzzle_attempts USING btree (puzzle_id);


--
-- Name: idx_sessions_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_account_id ON public.sessions USING btree (account_id);


--
-- Name: idx_sessions_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_expires_at ON public.sessions USING btree (expires_at);


--
-- Name: idx_shop_items_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shop_items_category ON public.shop_items USING btree (category);


--
-- Name: idx_shop_items_price; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shop_items_price ON public.shop_items USING btree (price);


--
-- Name: idx_user_currency_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_currency_account ON public.user_currency USING btree (account_id);


--
-- Name: idx_user_inventory_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_inventory_account ON public.user_inventory USING btree (account_id);


--
-- Name: accounts trigger_create_user_currency; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_create_user_currency AFTER INSERT ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.create_user_currency();


--
-- Name: game_reactions game_reactions_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_reactions
    ADD CONSTRAINT game_reactions_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.accounts(id);


--
-- Name: game_reactions game_reactions_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_reactions
    ADD CONSTRAINT game_reactions_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.accounts(id);


--
-- Name: games games_black_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_black_player_id_fkey FOREIGN KEY (black_player_id) REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: games games_white_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_white_player_id_fkey FOREIGN KEY (white_player_id) REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: loot_box_rewards loot_box_rewards_loot_box_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loot_box_rewards
    ADD CONSTRAINT loot_box_rewards_loot_box_id_fkey FOREIGN KEY (loot_box_id) REFERENCES public.loot_boxes(id) ON DELETE CASCADE;


--
-- Name: player_notifications player_notifications_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_notifications
    ADD CONSTRAINT player_notifications_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: puzzle_attempts puzzle_attempts_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.puzzle_attempts
    ADD CONSTRAINT puzzle_attempts_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: puzzle_attempts puzzle_attempts_puzzle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.puzzle_attempts
    ADD CONSTRAINT puzzle_attempts_puzzle_id_fkey FOREIGN KEY (puzzle_id) REFERENCES public.daily_puzzles(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: tournament_duels tournament_duels_challenger_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_duels
    ADD CONSTRAINT tournament_duels_challenger_id_fkey FOREIGN KEY (challenger_id) REFERENCES public.accounts(id);


--
-- Name: tournament_duels tournament_duels_opponent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_duels
    ADD CONSTRAINT tournament_duels_opponent_id_fkey FOREIGN KEY (opponent_id) REFERENCES public.accounts(id);


--
-- Name: tournament_duels tournament_duels_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_duels
    ADD CONSTRAINT tournament_duels_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- Name: tournament_duels tournament_duels_winner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_duels
    ADD CONSTRAINT tournament_duels_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.accounts(id);


--
-- Name: tournament_players tournament_players_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_players
    ADD CONSTRAINT tournament_players_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: tournament_players tournament_players_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_players
    ADD CONSTRAINT tournament_players_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- Name: tournaments tournaments_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.accounts(id);


--
-- Name: user_achievements user_achievements_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_achievement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id) ON DELETE CASCADE;


--
-- Name: user_board_theme user_board_theme_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_board_theme
    ADD CONSTRAINT user_board_theme_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: user_board_theme user_board_theme_board_theme_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_board_theme
    ADD CONSTRAINT user_board_theme_board_theme_id_fkey FOREIGN KEY (board_theme_id) REFERENCES public.animated_board_themes(id);


--
-- Name: user_calendar_claims user_calendar_claims_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_calendar_claims
    ADD CONSTRAINT user_calendar_claims_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: user_currency user_currency_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_currency
    ADD CONSTRAINT user_currency_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: user_emoji_inventory user_emoji_inventory_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_emoji_inventory
    ADD CONSTRAINT user_emoji_inventory_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: user_emoji_inventory user_emoji_inventory_emoji_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_emoji_inventory
    ADD CONSTRAINT user_emoji_inventory_emoji_id_fkey FOREIGN KEY (emoji_id) REFERENCES public.emoji_reactions(id);


--
-- Name: user_inventory user_inventory_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_inventory
    ADD CONSTRAINT user_inventory_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: user_inventory user_inventory_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_inventory
    ADD CONSTRAINT user_inventory_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.shop_items(id) ON DELETE CASCADE;


--
-- Name: user_loot_boxes user_loot_boxes_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_loot_boxes
    ADD CONSTRAINT user_loot_boxes_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: user_loot_boxes user_loot_boxes_loot_box_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_loot_boxes
    ADD CONSTRAINT user_loot_boxes_loot_box_id_fkey FOREIGN KEY (loot_box_id) REFERENCES public.loot_boxes(id);


--
-- Name: user_music_selection user_music_selection_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_music_selection
    ADD CONSTRAINT user_music_selection_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: user_music_selection user_music_selection_album_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_music_selection
    ADD CONSTRAINT user_music_selection_album_id_fkey FOREIGN KEY (album_id) REFERENCES public.music_albums(id) ON DELETE CASCADE;


--
-- Name: user_profile_theme user_profile_theme_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profile_theme
    ADD CONSTRAINT user_profile_theme_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: user_profile_theme user_profile_theme_banner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profile_theme
    ADD CONSTRAINT user_profile_theme_banner_id_fkey FOREIGN KEY (banner_id) REFERENCES public.profile_themes(id);


--
-- Name: user_profile_theme user_profile_theme_theme_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profile_theme
    ADD CONSTRAINT user_profile_theme_theme_id_fkey FOREIGN KEY (theme_id) REFERENCES public.profile_themes(id);


--
-- Name: user_quests user_quests_quest_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_quests
    ADD CONSTRAINT user_quests_quest_id_fkey FOREIGN KEY (quest_id) REFERENCES public.quests(id) ON DELETE CASCADE;


--
-- Name: user_quests user_quests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_quests
    ADD CONSTRAINT user_quests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 21NvpHVT7M7lHGCUC5Opb48kJSeSm9fMaHVPcoS5Srrzqd4fMlRJ2rrlDNTCEhh

