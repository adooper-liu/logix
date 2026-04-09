--
-- PostgreSQL database dump
--

-- Dumped from database version 15.7
-- Dumped by pg_dump version 15.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: dict_container_types; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.dict_container_types VALUES ('20GP', '20英尺普柜', '20'' General Purpose', 20, 'GP', 'General Purpose', '20''x8''x8''6"', 21700.00, 33.10, 1.00, 1, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('40GP', '40英尺普柜', '40'' General Purpose', 40, 'GP', 'General Purpose', '40''x8''x8''6"', 26630.00, 67.30, 2.00, 2, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('45GP', '45英尺普柜', '45'' General Purpose', 45, 'GP', 'General Purpose', '45''x8''x8''6"', 28400.00, 86.00, 2.25, 3, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('20HC', '20英尺高柜', '20'' High Cube', 20, 'HC', 'General Purpose High Cube', '20''x8''x9''6"', 21700.00, 33.90, 1.00, 4, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('40HC', '40英尺高柜', '40'' High Cube', 40, 'HC', 'General Purpose High Cube', '40''x8''x9''6"', 26580.00, 76.00, 2.00, 5, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('45HC', '45英尺高柜', '45'' High Cube', 45, 'HC', 'General Purpose High Cube', '45''x8''x9''6"', 27700.00, 85.90, 2.25, 6, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('53HC', '53英尺高柜', '53'' High Cube', 53, 'HC', 'General Purpose High Cube', '53''x8''x9''6"', 29480.00, 105.90, 2.65, 7, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('20FR', '20英尺平板柜', '20'' Flat Rack', 20, 'FR', 'Flat Rack', '20''x8''x8''6"', 27900.00, 31.50, 1.00, 8, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('40FR', '40英尺平板柜', '40'' Flat Rack', 40, 'FR', 'Flat Rack', '40''x8''x8''6"', 40200.00, 65.80, 2.00, 9, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('45FR', '45英尺平板柜', '45'' Flat Rack', 45, 'FR', 'Flat Rack', '45''x8''x8''6"', 42500.00, 85.00, 2.25, 10, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('20FQ', '20英尺高柜平板', '20'' Flat Rack High Cube', 20, 'FQ', 'Flat Rack High Cube', '20''x8''x9''6"', 27900.00, 32.50, 1.00, 11, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('40FQ', '40英尺高柜平板', '40'' Flat Rack High Cube', 40, 'FQ', 'Flat Rack High Cube', '40''x8''x9''6"', 40200.00, 68.00, 2.00, 12, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('45FQ', '45英尺高柜平板', '45'' Flat Rack High Cube', 45, 'FQ', 'Flat Rack High Cube', '45''x8''x9''6"', 42500.00, 88.00, 2.25, 13, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('20OT', '20英尺开顶柜', '20'' Open Top', 20, 'OT', 'Open Top', '20''x8''x8''6"', 21700.00, 31.50, 1.00, 14, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('40OT', '40英尺开顶柜', '40'' Open Top', 40, 'OT', 'Open Top', '40''x8''x8''6"', 26630.00, 65.80, 2.00, 15, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('45OT', '45英尺开顶柜', '45'' Open Top', 45, 'OT', 'Open Top', '45''x8''x8''6"', 27700.00, 85.00, 2.25, 16, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('20OQ', '20英尺高柜开顶', '20'' Open Top High Cube', 20, 'OQ', 'Open Top High Cube', '20''x8''x9''6"', 21700.00, 32.50, 1.00, 17, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('40OQ', '40英尺高柜开顶', '40'' Open Top High Cube', 40, 'OQ', 'Open Top High Cube', '40''x8''x9''6"', 26630.00, 68.00, 2.00, 18, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('45OQ', '45英尺高柜开顶', '45'' Open Top High Cube', 45, 'OQ', 'Open Top High Cube', '45''x8''x9''6"', 27700.00, 88.00, 2.25, 19, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('20TK', '20英尺罐式柜', '20'' Tank', 20, 'TK', 'Tank', '20''x8''x8''6"', 21700.00, 24.00, 1.00, 20, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('40TK', '40英尺罐式柜', '40'' Tank', 40, 'TK', 'Tank', '40''x8''x8''6"', 26630.00, 50.00, 2.00, 21, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('45TK', '45英尺罐式柜', '45'' Tank', 45, 'TK', 'Tank', '45''x8''x8''6"', 27700.00, 65.00, 2.25, 22, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('20TQ', '20英尺高柜罐式', '20'' Tank High Cube', 20, 'TQ', 'Tank High Cube', '20''x8''x9''6"', 21700.00, 25.00, 1.00, 23, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('40TQ', '40英尺高柜罐式', '40'' Tank High Cube', 40, 'TQ', 'Tank High Cube', '40''x8''x9''6"', 26630.00, 52.00, 2.00, 24, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('45TQ', '45英尺高柜罐式', '45'' Tank High Cube', 45, 'TQ', 'Tank High Cube', '45''x8''x9''6"', 27700.00, 68.00, 2.25, 25, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('20RF', '20英尺冷藏柜', '20'' Reefer', 20, 'RF', 'Reefer', '20''x8''x8''6"', 21000.00, 28.00, 1.00, 26, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('40RF', '40英尺冷藏柜', '40'' Reefer', 40, 'RF', 'Reefer', '40''x8''x8''6"', 27000.00, 58.00, 2.00, 27, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('45RF', '45英尺冷藏柜', '45'' Reefer', 45, 'RF', 'Reefer', '45''x8''x8''6"', 28500.00, 78.00, 2.25, 28, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('20RH', '20英尺高柜冷藏', '20'' Reefer High Cube', 20, 'RH', 'Reefer High Cube', '20''x8''x9''6"', 21000.00, 29.00, 1.00, 29, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('40RH', '40英尺高柜冷藏', '40'' Reefer High Cube', 40, 'RH', 'Reefer High Cube', '40''x8''x9''6"', 27000.00, 60.00, 2.00, 30, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('45RH', '45英尺高柜冷藏', '45'' Reefer High Cube', 45, 'RH', 'Reefer High Cube', '45''x8''x9''6"', 28500.00, 80.00, 2.25, 31, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('20HT', '20英尺挂衣柜', '20'' Dress Hanger', 20, 'HT', 'Dress Hanger', '20''x8''x8''6"', 21700.00, 31.00, 1.00, 32, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('40HT', '40英尺挂衣柜', '40'' Dress Hanger', 40, 'HT', 'Dress Hanger', '40''x8''x8''6"', 26630.00, 65.00, 2.00, 33, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('45HT', '45英尺挂衣柜', '45'' Dress Hanger', 45, 'HT', 'Dress Hanger', '45''x8''x8''6"', 27700.00, 85.00, 2.25, 34, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('20HH', '20英尺高柜挂衣', '20'' Dress Hanger High Cube', 20, 'HH', 'Dress Hanger High Cube', '20''x8''x9''6"', 21700.00, 32.00, 1.00, 35, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('40HH', '40英尺高柜挂衣', '40'' Dress Hanger High Cube', 40, 'HH', 'Dress Hanger High Cube', '40''x8''x9''6"', 26630.00, 67.00, 2.00, 36, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');
INSERT INTO public.dict_container_types VALUES ('45HH', '45英尺高柜挂衣', '45'' Dress Hanger High Cube', 45, 'HH', 'Dress Hanger High Cube', '45''x8''x9''6"', 27700.00, 88.00, 2.25, 37, true, NULL, '2026-03-24 10:45:37.24989', '2026-03-24 10:45:37.24989');


--
-- Data for Name: dict_countries; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.dict_countries VALUES ('US', '美国', 'United States', 'NA', 'North America', 'USD', '+1', 1, true, NULL, '2026-03-24 10:45:37.220452', '2026-03-24 10:45:37.220452');
INSERT INTO public.dict_countries VALUES ('CA', '加拿大', 'Canada', 'NA', 'North America', 'CAD', '+1', 2, true, NULL, '2026-03-24 10:45:37.220452', '2026-03-24 10:45:37.220452');
INSERT INTO public.dict_countries VALUES ('GB', '英国', 'United Kingdom', 'EU', 'Europe', 'GBP', '+44', 3, true, NULL, '2026-03-24 10:45:37.220452', '2026-03-24 10:45:37.220452');
INSERT INTO public.dict_countries VALUES ('DE', '德国', 'Germany', 'EU', 'Europe', 'EUR', '+49', 4, true, NULL, '2026-03-24 10:45:37.220452', '2026-03-24 10:45:37.220452');
INSERT INTO public.dict_countries VALUES ('FR', '法国', 'France', 'EU', 'Europe', 'EUR', '+33', 5, true, NULL, '2026-03-24 10:45:37.220452', '2026-03-24 10:45:37.220452');
INSERT INTO public.dict_countries VALUES ('IT', '意大利', 'Italy', 'EU', 'Europe', 'EUR', '+39', 6, true, NULL, '2026-03-24 10:45:37.220452', '2026-03-24 10:45:37.220452');
INSERT INTO public.dict_countries VALUES ('ES', '西班牙', 'Spain', 'EU', 'Europe', 'EUR', '+34', 7, true, NULL, '2026-03-24 10:45:37.220452', '2026-03-24 10:45:37.220452');
INSERT INTO public.dict_countries VALUES ('NL', '荷兰', 'Netherlands', 'EU', 'Europe', 'EUR', '+31', 8, true, NULL, '2026-03-24 10:45:37.220452', '2026-03-24 10:45:37.220452');
INSERT INTO public.dict_countries VALUES ('BE', '比利时', 'Belgium', 'EU', 'Europe', 'EUR', '+32', 9, true, NULL, '2026-03-24 10:45:37.220452', '2026-03-24 10:45:37.220452');
INSERT INTO public.dict_countries VALUES ('PL', '波兰', 'Poland', 'EU', 'Europe', 'PLN', '+48', 10, true, NULL, '2026-03-24 10:45:37.220452', '2026-03-24 10:45:37.220452');
INSERT INTO public.dict_countries VALUES ('CZ', '捷克', 'Czech Republic', 'EU', 'Europe', 'CZK', '+420', 11, true, NULL, '2026-03-24 10:45:37.220452', '2026-03-24 10:45:37.220452');
INSERT INTO public.dict_countries VALUES ('AT', '奥地利', 'Austria', 'EU', 'Europe', 'EUR', '+43', 12, true, NULL, '2026-03-24 10:45:37.220452', '2026-03-24 10:45:37.220452');
INSERT INTO public.dict_countries VALUES ('CH', '瑞士', 'Switzerland', 'EU', 'Europe', 'CHF', '+41', 13, true, NULL, '2026-03-24 10:45:37.220452', '2026-03-24 10:45:37.220452');
INSERT INTO public.dict_countries VALUES ('SE', '瑞典', 'Sweden', 'EU', 'Europe', 'SEK', '+46', 14, true, NULL, '2026-03-24 10:45:37.220452', '2026-03-24 10:45:37.220452');
INSERT INTO public.dict_countries VALUES ('NO', '挪威', 'Norway', 'EU', 'Europe', 'NOK', '+47', 15, true, NULL, '2026-03-24 10:45:37.220452', '2026-03-24 10:45:37.220452');
INSERT INTO public.dict_countries VALUES ('DK', '丹麦', 'Denmark', 'EU', 'Europe', 'DKK', '+45', 16, true, NULL, '2026-03-24 10:45:37.220452', '2026-03-24 10:45:37.220452');
INSERT INTO public.dict_countries VALUES ('FI', '芬兰', 'Finland', 'EU', 'Europe', 'EUR', '+358', 17, true, NULL, '2026-03-24 10:45:37.220452', '2026-03-24 10:45:37.220452');
INSERT INTO public.dict_countries VALUES ('JP', '日本', 'Japan', 'ASIA', 'Asia', 'JPY', '+81', 18, true, NULL, '2026-03-24 10:45:37.220452', '2026-03-24 10:45:37.220452');
INSERT INTO public.dict_countries VALUES ('KR', '韩国', 'South Korea', 'ASIA', 'Asia', 'KRW', '+82', 19, true, NULL, '2026-03-24 10:45:37.220452', '2026-03-24 10:45:37.220452');
INSERT INTO public.dict_countries VALUES ('SG', '新加坡', 'Singapore', 'ASIA', 'Asia', 'SGD', '+65', 20, true, NULL, '2026-03-24 10:45:37.220452', '2026-03-24 10:45:37.220452');
INSERT INTO public.dict_countries VALUES ('MY', '马来西亚', 'Malaysia', 'ASIA', 'Asia', 'MYR', '+60', 21, true, NULL, '2026-03-24 10:45:37.220452', '2026-03-24 10:45:37.220452');
INSERT INTO public.dict_countries VALUES ('TH', '泰国', 'Thailand', 'ASIA', 'Asia', 'THB', '+66', 22, true, NULL, '2026-03-24 10:45:37.220452', '2026-03-24 10:45:37.220452');
INSERT INTO public.dict_countries VALUES ('VN', '越南', 'Vietnam', 'ASIA', 'Asia', 'VND', '+84', 23, true, NULL, '2026-03-24 10:45:37.220452', '2026-03-24 10:45:37.220452');
INSERT INTO public.dict_countries VALUES ('PH', '菲律宾', 'Philippines', 'ASIA', 'Asia', 'PHP', '+63', 24, true, NULL, '2026-03-24 10:45:37.220452', '2026-03-24 10:45:37.220452');
INSERT INTO public.dict_countries VALUES ('ID', '印度尼西亚', 'Indonesia', 'ASIA', 'Asia', 'IDR', '+62', 25, true, NULL, '2026-03-24 10:45:37.220452', '2026-03-24 10:45:37.220452');
INSERT INTO public.dict_countries VALUES ('AU', '澳大利亚', 'Australia', 'OCEANIA', 'Oceania', 'AUD', '+61', 26, true, NULL, '2026-03-24 10:45:37.220452', '2026-03-24 10:45:37.220452');
INSERT INTO public.dict_countries VALUES ('NZ', '新西兰', 'New Zealand', 'OCEANIA', 'Oceania', 'NZD', '+64', 27, true, NULL, '2026-03-24 10:45:37.220452', '2026-03-24 10:45:37.220452');
INSERT INTO public.dict_countries VALUES ('IE', '爱尔兰', 'Ireland', 'EU', 'Europe', 'EUR', '+353', 28, true, NULL, '2026-03-24 10:45:37.220452', '2026-03-24 10:45:37.220452');
INSERT INTO public.dict_countries VALUES ('RO', '罗马尼亚', 'Romania', 'EU', 'Europe', 'RON', '+40', 29, true, NULL, '2026-03-24 10:45:37.220452', '2026-03-24 10:45:37.220452');
INSERT INTO public.dict_countries VALUES ('CN', '中国', 'China', 'ASIA', 'Asia', 'CNY', '+86', 99, true, NULL, '2026-03-24 10:45:37.220452', '2026-03-24 10:45:37.220452');
INSERT INTO public.dict_countries VALUES ('AE', '阿联酋', 'United Arab Emirates', '中东', '亚洲', NULL, NULL, 0, true, NULL, '2026-03-24 11:35:24.467705', '2026-03-24 11:35:24.467705');
INSERT INTO public.dict_countries VALUES ('AR', '阿根廷', 'Argentina', '南美', '南美洲', NULL, NULL, 0, true, NULL, '2026-03-24 11:35:24.467705', '2026-03-24 11:35:24.467705');
INSERT INTO public.dict_countries VALUES ('BR', '巴西', 'Brazil', '南美', '南美洲', NULL, NULL, 0, true, NULL, '2026-03-24 11:35:24.467705', '2026-03-24 11:35:24.467705');
INSERT INTO public.dict_countries VALUES ('CL', '智利', 'Chile', '南美', '南美洲', NULL, NULL, 0, true, NULL, '2026-03-24 11:35:24.467705', '2026-03-24 11:35:24.467705');
INSERT INTO public.dict_countries VALUES ('EG', '埃及', 'Egypt', '中东', '非洲', NULL, NULL, 0, true, NULL, '2026-03-24 11:35:24.467705', '2026-03-24 11:35:24.467705');
INSERT INTO public.dict_countries VALUES ('IN', '印度', 'India', '南亚', '亚洲', NULL, NULL, 0, true, NULL, '2026-03-24 11:35:24.467705', '2026-03-24 11:35:24.467705');
INSERT INTO public.dict_countries VALUES ('MA', '摩洛哥', 'Morocco', '北非', '非洲', NULL, NULL, 0, true, NULL, '2026-03-24 11:35:24.467705', '2026-03-24 11:35:24.467705');
INSERT INTO public.dict_countries VALUES ('PE', '秘鲁', 'Peru', '南美', '南美洲', NULL, NULL, 0, true, NULL, '2026-03-24 11:35:24.467705', '2026-03-24 11:35:24.467705');
INSERT INTO public.dict_countries VALUES ('QA', '卡塔尔', 'Qatar', '中东', '亚洲', NULL, NULL, 0, true, NULL, '2026-03-24 11:35:24.467705', '2026-03-24 11:35:24.467705');
INSERT INTO public.dict_countries VALUES ('SA', '沙特阿拉伯', 'Saudi Arabia', '中东', '亚洲', NULL, NULL, 0, true, NULL, '2026-03-24 11:35:24.467705', '2026-03-24 11:35:24.467705');
INSERT INTO public.dict_countries VALUES ('ZA', '南非', 'South Africa', '南部非洲', '非洲', NULL, NULL, 0, true, NULL, '2026-03-24 11:35:24.467705', '2026-03-24 11:35:24.467705');
INSERT INTO public.dict_countries VALUES ('HK', '中国香港', 'Hong Kong, China', '华南', '亚洲', NULL, NULL, 0, true, NULL, '2026-03-24 23:33:13.159189', '2026-03-24 23:33:13.159189');
INSERT INTO public.dict_countries VALUES ('PT', '葡萄牙', 'Portugal', '南欧', '欧洲', 'EUR', NULL, 0, true, NULL, '2026-03-24 23:33:13.159189', '2026-03-24 23:33:13.159189');


--
-- Data for Name: dict_customer_types; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.dict_customer_types VALUES ('PLATFORM', '平台客户', 'Platform Customers', 1, true, '电商客户：Wayfair、Amazon、Target等', '2026-03-24 10:45:37.229154', '2026-03-24 10:45:37.229154');
INSERT INTO public.dict_customer_types VALUES ('SUBSIDIARY', '集团内部子公司', 'Group Subsidiaries', 2, true, 'AoSOM/MH集团9个海外子公司', '2026-03-24 10:45:37.229154', '2026-03-24 10:45:37.229154');
INSERT INTO public.dict_customer_types VALUES ('OTHER', '其他客户', 'Other Customers', 99, true, '其他客户', '2026-03-24 10:45:37.229154', '2026-03-24 10:45:37.229154');


--
-- Data for Name: dict_customs_brokers; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.dict_customs_brokers VALUES ('UNSPECIFIED', '未指定清关公司', 'Unspecified Customs Broker', NULL, NULL, NULL, 'ACTIVE', '智能排柜时无匹配清关公司时使用', '2026-03-24 10:45:44.801282', '2026-03-24 10:45:44.801282');


--
-- Data for Name: dict_freight_forwarders; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.dict_freight_forwarders VALUES ('SELA_VN', 'CTY TNHH SOUTHEAST LOGISTICS VIET NAM', 'CTY TNHH Southeast Logistics Viet Nam', NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.240881', '2026-03-24 10:45:37.240881');
INSERT INTO public.dict_freight_forwarders VALUES ('MAERSK_LOG', 'MAERSK LOGISTICS & SERVICES', 'Maersk Logistics & Services', NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.240881', '2026-03-24 10:45:37.240881');
INSERT INTO public.dict_freight_forwarders VALUES ('VN_COMPANY', 'VIETNAM COMPANY LIMITED', 'Vietnam Company Limited', NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.240881', '2026-03-24 10:45:37.240881');
INSERT INTO public.dict_freight_forwarders VALUES ('SELA_MY', 'SOUTHEAST INTERNATIONAL LOGISTICS MALAYSIA SDN BHD', 'Southeast International Logistics Malaysia Sdn Bhd', NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.240881', '2026-03-24 10:45:37.240881');
INSERT INTO public.dict_freight_forwarders VALUES ('JIANDA', '简达物流集团股份有限公司', 'Jianda Logistics Group Co Ltd', NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.240881', '2026-03-24 10:45:37.240881');
INSERT INTO public.dict_freight_forwarders VALUES ('TITULIAN', '宁波天图翼联物流科技有限公司', 'Ningbo Titu Lian Logistics Technology Co Ltd', NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.240881', '2026-03-24 10:45:37.240881');
INSERT INTO public.dict_freight_forwarders VALUES ('NINGBO_SINOTRANS', '宁波外运国际货运代理有限公司', 'Ningbo Sinotrans International Freight Forwarding Co Ltd', NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.240881', '2026-03-24 10:45:37.240881');
INSERT INTO public.dict_freight_forwarders VALUES ('NEW_FF_1775613770942', '浙江中外运有限公司宁波泛海分公司', '浙江中外运有限公司宁波泛海分公司', NULL, NULL, NULL, NULL, '2026-04-08 02:02:51.00773', '2026-04-08 02:02:51.00773');
INSERT INTO public.dict_freight_forwarders VALUES ('NEW_FF_1775613772813', '江苏远洋新世纪供应链有限公司', '江苏远洋新世纪供应链有限公司', NULL, NULL, NULL, NULL, '2026-04-08 02:02:52.93446', '2026-04-08 02:02:52.93446');
INSERT INTO public.dict_freight_forwarders VALUES ('NEW_FF_1775613804302', '马士基物流（上海）有限公司宁波分公司', '马士基物流（上海）有限公司宁波分公司', NULL, NULL, NULL, NULL, '2026-04-08 02:03:24.487548', '2026-04-08 02:03:24.487548');
INSERT INTO public.dict_freight_forwarders VALUES ('NEW_FF_1775614105041', 'MAERSK LOGISTICS & SERVICES VIETNAM COMPANY LIMITED', 'MAERSK LOGISTICS & SERVICES VIETNAM COMPANY LIMITED', NULL, NULL, NULL, NULL, '2026-04-08 02:08:24.687893', '2026-04-08 02:08:24.687893');
INSERT INTO public.dict_freight_forwarders VALUES ('NEW_FF_1775614719722', 'ECU WORLDWIDE VIETNAM JSC - QUYNHON BRANCH', 'ECU WORLDWIDE VIETNAM JSC - QUYNHON BRANCH', NULL, NULL, NULL, NULL, '2026-04-08 02:18:38.666987', '2026-04-08 02:18:38.666987');


--
-- Data for Name: dict_overseas_companies; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.dict_overseas_companies VALUES ('AOSOM_US', 'AOSOM LLC', 'AOSOM LLC', 'US', NULL, NULL, '+1-XXX-XXXX', 'contact@aosom-us.com', 'USD', NULL, NULL, NULL, 1, true, NULL, '2026-03-24 10:45:37.256107', '2026-03-24 10:45:37.256107');
INSERT INTO public.dict_overseas_companies VALUES ('AOSOM_CA', 'AOSOM CANADA INC.', 'AOSOM Canada Inc.', 'CA', NULL, NULL, '+1-XXX-XXXX', 'contact@aosom-ca.com', 'CAD', NULL, NULL, NULL, 2, true, NULL, '2026-03-24 10:45:37.256107', '2026-03-24 10:45:37.256107');
INSERT INTO public.dict_overseas_companies VALUES ('MH_UK', 'MH STAR UK LTD', 'MH Star UK Ltd', 'GB', NULL, NULL, '+44-XXX-XXXX', 'contact@mh-uk.com', 'GBP', NULL, NULL, NULL, 3, true, NULL, '2026-03-24 10:45:37.256107', '2026-03-24 10:45:37.256107');
INSERT INTO public.dict_overseas_companies VALUES ('MH_FR', 'MH FRANCE', 'MH France', 'FR', NULL, NULL, '+33-XXX-XXXX', 'contact@mh-fr.com', 'EUR', NULL, NULL, NULL, 4, true, NULL, '2026-03-24 10:45:37.256107', '2026-03-24 10:45:37.256107');
INSERT INTO public.dict_overseas_companies VALUES ('MH_DE', 'MH HANDEL GMBH', 'MH Handel GmbH', 'DE', NULL, NULL, '+49-XXX-XXXX', 'contact@mh-de.com', 'EUR', NULL, NULL, NULL, 5, true, NULL, '2026-03-24 10:45:37.256107', '2026-03-24 10:45:37.256107');
INSERT INTO public.dict_overseas_companies VALUES ('AOSOM_IT', 'AOSOM ITALY SRL', 'AOSOM Italy Srl', 'IT', NULL, NULL, '+39-XXX-XXXX', 'contact@aosom-it.com', 'EUR', NULL, NULL, NULL, 6, true, NULL, '2026-03-24 10:45:37.256107', '2026-03-24 10:45:37.256107');
INSERT INTO public.dict_overseas_companies VALUES ('AOSOM_IE', 'AOSOM IRELAND LIMITED', 'AOSOM Ireland Ltd', 'IE', NULL, NULL, '+353-XXX-XXXX', 'contact@aosom-ie.com', 'EUR', NULL, NULL, NULL, 7, true, NULL, '2026-03-24 10:45:37.256107', '2026-03-24 10:45:37.256107');
INSERT INTO public.dict_overseas_companies VALUES ('AOSOM_ES', 'SPANISH AOSOM, S.L.', 'Spanish Aosom S.L.', 'ES', NULL, NULL, '+34-XXX-XXXX', 'contact@aosom-es.com', 'EUR', NULL, NULL, NULL, 8, true, NULL, '2026-03-24 10:45:37.256107', '2026-03-24 10:45:37.256107');
INSERT INTO public.dict_overseas_companies VALUES ('AOSOM_RO', 'AOSOM ROMANIA S.R.L.', 'AOSOM Romania S.R.L.', 'RO', NULL, NULL, '+40-XXX-XXXX', 'contact@aosom-ro.com', 'RON', NULL, NULL, NULL, 9, true, NULL, '2026-03-24 10:45:37.256107', '2026-03-24 10:45:37.256107');


--
-- Data for Name: dict_ports; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.dict_ports VALUES ('CNSHG', '上海', 'Shanghai', 'PORT', 'CN', 'SH', 'Shanghai', 8, 31.230400, 121.473700, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('CNSZX', '深圳', 'Shenzhen', 'PORT', 'CN', 'GD', 'Shenzhen', 8, 22.543100, 114.057900, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('CNNGB', '宁波', 'Ningbo', 'PORT', 'CN', 'ZJ', 'Shanghai', 8, 29.868300, 121.544000, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('CNYTN', '盐田', 'Yantian', 'PORT', 'CN', 'GD', 'Shenzhen', 8, 22.558900, 114.272000, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('CNQNG', '青岛', 'Qingdao', 'PORT', 'CN', 'SD', 'Qingdao', 8, 36.067100, 120.382600, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('CNTAO', '天津', 'Tianjin', 'PORT', 'CN', 'TJ', 'Beijing', 8, 39.084200, 117.200900, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('CNDLC', '大连', 'Dalian', 'PORT', 'CN', 'LN', 'Dalian', 8, 38.914000, 121.614700, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('CNXMN', '厦门', 'Xiamen', 'PORT', 'CN', 'FJ', 'Xiamen', 8, 24.479800, 118.089400, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('CNGZU', '广州', 'Guangzhou', 'PORT', 'CN', 'GD', 'Guangzhou', 8, 23.129100, 113.264400, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('CNTSN', '天津新港', 'Tianjin Xingang', 'PORT', 'CN', 'TJ', 'Beijing', 8, 38.933900, 117.883000, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('CNLZU', '连云港', 'Lianyungang', 'PORT', 'CN', 'JS', 'Shanghai', 8, 34.596700, 119.222800, true, true, false, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('CNWHU', '武汉', 'Wuhan', 'PORT', 'CN', 'HB', 'Wuhan', 8, 30.592800, 114.305500, true, true, false, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('CNQNZ', '泉州', 'Quanzhou', 'PORT', 'CN', 'FJ', 'Xiamen', 8, 24.874100, 118.675700, true, true, false, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('CNSZW', '石围', 'Shiwei', 'PORT', 'CN', 'GD', 'Shenzhen', 8, 22.583300, 113.916700, true, true, false, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('CNYKT', '营口', 'Yingkou', 'PORT', 'CN', 'LN', 'Shenyang', 8, 40.668000, 122.235000, true, true, false, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('CNTAI', '太仓', 'Taicang', 'PORT', 'CN', 'JS', 'Shanghai', 8, 31.449700, 121.108900, true, true, false, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('BEBRU', '布鲁塞尔', 'Brussels', 'PORT', 'BE', 'BRU', 'Brussels', 1, 50.850300, 4.351700, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('CHZRH', '苏黎世', 'Zurich', 'PORT', 'CH', 'ZH', 'Zurich', 1, 47.376900, 8.541700, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('ATVIE', '维也纳', 'Vienna', 'PORT', 'AT', 'W', 'Vienna', 1, 48.208200, 16.373800, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('JPTYO', '东京', 'Tokyo', 'PORT', 'JP', '13', 'Tokyo', 9, 35.676200, 139.650300, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('JPOSA', '大阪', 'Osaka', 'PORT', 'JP', '27', 'Tokyo', 9, 34.693700, 135.502300, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('JPNKT', '名古屋', 'Nagoya', 'PORT', 'JP', '23', 'Tokyo', 9, 35.181500, 136.906600, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('JPNGO', '福冈', 'Fukuoka', 'PORT', 'JP', '40', 'Tokyo', 9, 33.590400, 130.401700, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('KRINC', '仁川', 'Incheon', 'PORT', 'KR', '28', 'Seoul', 9, 37.456300, 126.705200, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('SGSIN', '新加坡', 'Singapore', 'PORT', 'SG', 'SG', 'Singapore', 8, 1.352100, 103.819800, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('MYKUL', '吉隆坡', 'Kuala Lumpur', 'PORT', 'MY', 'KUL', 'Kuala_Lumpur', 8, 3.139000, 101.686900, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('THBKK', '曼谷', 'Bangkok', 'PORT', 'TH', 'BKK', 'Bangkok', 7, 13.756300, 100.501800, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('IDCGK', '雅加达', 'Jakarta', 'PORT', 'ID', 'JKT', 'Jakarta', 7, -6.208800, 106.845600, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('VNDEL', '胡志明', 'Ho Chi Minh', 'PORT', 'VN', 'SGN', 'Ho_Chi_Minh', 7, 10.823100, 106.629700, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('AEDXB', '迪拜', 'Dubai', 'PORT', 'AE', 'DU', 'Dubai', 4, 25.204800, 55.270800, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('AEJEA', '杰贝阿里', 'Jebel Ali', 'PORT', 'AE', 'DU', 'Dubai', 4, 25.039200, 55.185500, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('SAJED', '吉达', 'Jeddah', 'PORT', 'SA', '14', 'Riyadh', 3, 21.543300, 39.172800, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('QADOH', '多哈', 'Doha', 'PORT', 'QA', 'DA', 'Qatar', 3, 25.285400, 51.531000, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('BRGRU', '圣保罗', 'Sao Paulo', 'PORT', 'BR', 'SP', 'Sao_Paulo', -3, -23.550500, -46.633300, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('ARSZE', '布宜诺斯艾利斯', 'Buenos Aires', 'PORT', 'AR', 'BA', 'Buenos_Aires', -3, -34.603700, -58.381600, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('CLLIM', '利马', 'Lima', 'PORT', 'CL', 'LIM', 'Lima', -5, -12.046400, -77.042800, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('PELIM', '利马(秘鲁)', 'Lima Peru', 'PORT', 'PE', 'LIM', 'Lima', -5, -12.046400, -77.042800, true, true, false, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('ZACPT', '开普敦', 'Cape Town', 'PORT', 'ZA', 'WC', 'Johannesburg', 2, -33.924900, 18.424100, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('EGCAI', '开罗', 'Cairo', 'PORT', 'EG', 'C', 'Cairo', 2, 30.044400, 31.235700, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('MNCPT', '卡萨布兰卡', 'Casablanca', 'PORT', 'MA', 'CM', 'Casablanca', 1, 33.573100, -7.589800, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('INDEL', '德里', 'Delhi', 'PORT', 'IN', 'DL', 'New_Delhi', 6, 28.613900, 77.209000, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('INBOM', '孟买', 'Mumbai', 'PORT', 'IN', 'MH', 'Mumbai', 6, 19.076000, 72.877700, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('AUSYD', '悉尼', 'Sydney', 'PORT', 'AU', 'NSW', 'Sydney', 10, -33.868800, 151.209300, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('AUMEL', '墨尔本', 'Melbourne', 'PORT', 'AU', 'VIC', 'Melbourne', 10, -37.813600, 144.963100, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('AUBNE', '布里斯班', 'Brisbane', 'PORT', 'AU', 'QLD', 'Brisbane', 10, -27.469800, 153.025100, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('AUFRE', '弗里曼特尔', 'Fremantle', 'PORT', 'AU', 'WA', 'Perth', 8, -32.056900, 115.743900, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('NZAKL', '奥克兰', 'Auckland', 'PORT', 'NZ', 'AUK', 'Auckland', 12, -36.848500, 174.763300, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('USCHI', '芝加哥', 'Chicago', 'PORT', 'US', 'IL', 'Chicago', -6, 41.878100, -87.629800, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('GBLHR', '伦敦', 'London', 'PORT', 'GB', 'ENG', 'London', 0, 51.507400, -0.127800, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('DEHAM', '汉堡', 'Hamburg', 'PORT', 'DE', 'HH', 'Berlin', 1, 53.551100, 9.993700, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('DETXF', '法兰克福', 'Frankfurt', 'PORT', 'DE', 'HE', 'Berlin', 1, 50.110900, 8.682100, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('FRAIX', '巴黎', 'Paris', 'PORT', 'FR', 'IDF', 'Paris', 1, 48.856600, 2.352200, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('ITFCO', '罗马', 'Rome', 'PORT', 'IT', 'LAZ', 'Rome', 1, 41.902800, 12.496400, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('NLAMS', '阿姆斯特丹', 'Amsterdam', 'PORT', 'NL', 'NH', 'Amsterdam', 1, 52.367600, 4.904100, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('ESMAD', '马德里', 'Madrid', 'PORT', 'ES', 'MD', 'Madrid', 1, 40.416800, -3.703800, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('CAVAN', '温哥华', 'Vancouver', 'PORT', 'CA', 'BC', 'Vancouver', -8, 49.282700, -123.120700, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('CATRN', '多伦多', 'Toronto', 'PORT', 'CA', 'ON', 'Toronto', -5, 43.700100, -79.416300, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('CAMTR', '蒙特利尔', 'Montreal', 'PORT', 'CA', 'QC', 'Montreal', -5, 45.501700, -73.567300, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('CNSHA', '上海', 'Shanghai', 'PORT', 'CN', 'SH', 'Shanghai', 8, 31.230400, 121.473700, true, true, true, NULL, NULL, '2026-03-24 10:45:46.610576', '2026-03-24 10:45:46.610576');
INSERT INTO public.dict_ports VALUES ('GBFXT', '费利克斯托', 'Felixstowe', 'PORT', 'GB', 'ENG', 'Felixstowe', 0, 51.956100, 1.351900, true, true, true, NULL, NULL, '2026-03-24 11:21:21.710606', '2026-03-24 11:21:21.710606');
INSERT INTO public.dict_ports VALUES ('USATL', '亚特兰大', 'Atlanta', 'PORT', 'US', 'GA', 'Atlanta', -5, 33.749000, -84.388000, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('USEWR', '纽瓦克', 'Newark', 'PORT', 'US', 'NJ', 'Newark', -5, 40.735700, -74.172400, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('USHOU', '休斯顿', 'Houston', 'PORT', 'US', 'TX', 'Houston', -6, 29.760400, -95.369800, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('USJFK', '肯尼迪', 'JFK Airport', 'PORT', 'US', 'NY', 'New York', -5, 40.641300, -73.778100, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('USLAX', '洛杉矶', 'Los Angeles', 'PORT', 'US', 'CA', 'Los Angeles', -8, 33.749000, -118.247700, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('USLGB', '长滩', 'Long Beach', 'PORT', 'US', 'CA', 'Long Beach', -8, 33.754400, -118.189000, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('USMIA', '迈阿密', 'Miami', 'PORT', 'US', 'FL', 'Miami', -5, 25.761700, -80.191800, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('USNYC', '纽约', 'New York', 'PORT', 'US', 'NY', 'New York', -5, 40.712800, -74.006000, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('USORD', '奥黑尔', 'Chicago O''Hare', 'PORT', 'US', 'IL', 'Chicago', -6, 41.974200, -87.907300, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('USSAV', '萨凡纳', 'Savannah', 'PORT', 'US', 'GA', 'Savannah', -5, 32.080900, -81.091200, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('USSEA', '西雅图', 'Seattle', 'PORT', 'US', 'WA', 'Seattle', -8, 47.606200, -122.332100, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('USSFO', '旧金山', 'San Francisco', 'PORT', 'US', 'CA', 'San Francisco', -8, 37.774900, -122.419400, true, true, true, 'ACTIVE', NULL, '2026-03-24 10:45:37.232382', '2026-03-24 10:45:37.232382');
INSERT INTO public.dict_ports VALUES ('CNZPU', '乍浦港,平湖,嘉兴,浙江', 'ZHAPU PT', 'PORT', NULL, NULL, NULL, 8, 30.609000, 121.095450, true, true, true, 'ACTIVE', NULL, '2026-03-30 02:12:26.385588', '2026-03-30 02:12:26.385588');
INSERT INTO public.dict_ports VALUES ('CNDCB', '大铲湾,深圳', 'DA CHAN BAY', 'PORT', NULL, NULL, NULL, 8, 22.538085, 113.870200, true, true, true, 'ACTIVE', NULL, '2026-03-30 02:12:40.689143', '2026-03-30 02:12:40.689143');
INSERT INTO public.dict_ports VALUES ('CNTXG', '天津', 'TIANJIN(XINGANG)', 'PORT', NULL, NULL, NULL, 8, 38.990600, 117.721350, true, true, true, 'ACTIVE', NULL, '2026-03-30 02:12:49.538881', '2026-03-30 02:12:49.538881');
INSERT INTO public.dict_ports VALUES ('FRLEH', '勒阿弗尔', 'LE HAVRE', 'PORT', 'FR', NULL, NULL, 2, 49.485330, 0.108100, true, true, true, 'ACTIVE', NULL, '2026-03-30 02:12:22.115077', '2026-03-30 02:12:22.115077');
INSERT INTO public.dict_ports VALUES ('ITGOA', '热那亚', 'GENOVA', 'PORT', 'IT', NULL, NULL, 2, 44.416670, 8.966670, true, true, true, 'ACTIVE', NULL, '2026-03-30 02:12:26.434954', '2026-03-30 02:12:26.434954');


--
-- Data for Name: dict_shipping_companies; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.dict_shipping_companies VALUES ('ACI', '亚利安莎', 'Arian Shipping', 'ACIC', 'MSK', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('ANL', '澳航', 'ANL Container Line', 'ANNU', 'ANL', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('APL', '美国总统', 'American President Lines', 'APLU', 'CMA', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('CCN', '智利航运', 'CCNI', 'CCNR', 'MSK', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('CKL', '天敬', 'CK Line', 'CKLC', 'CKL', true, true, false, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('CMA', '达飞', 'CMA CGM', 'CMDU', 'CMA', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('CNC', '正利', 'CNC Line', 'CNCL', 'CNC', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('COS', '中远', 'COSCO', 'COSU', 'COSCO', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('CUL', '中联', 'Cheng Lie Navigation', 'CULU', 'CUL', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('DEL', '达贸轮船', 'Delmas', 'DELC', 'CMA', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('EMC', '长荣', 'Evergreen Marine', 'EGLV', 'EMC', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('ESL', '阿联酋', 'ESL Shipping', 'EMIV', 'ESL', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('GSL', '金星', 'Gold Star Line', 'GOSU', 'GSL', false, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('HAL', '兴亚', 'Heung-A Shipping', 'HALC', 'HAL', false, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('HAS', '海华', 'HASCO', 'HASU', 'HASCO', false, true, true, NULL, NULL, NULL, 'ACTIVE', 'Requires 箱号+英文船名+航次', '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('HBS', '汉堡南美', 'Hamburg Süd', 'SUDU', 'MSK', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('HMM', '现代', 'HMM', 'HDMU', 'HMM', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('HPL', '赫伯罗特', 'Hapag-Lloyd', 'HLCU', 'HPL', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('IAL', '运达', 'IAL', 'IALU', 'IAL', false, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('SJJ', '锦江', 'Jinjiang Shipping', 'JINX', 'JINJIANG', false, true, true, NULL, NULL, NULL, 'ACTIVE', 'Requires 箱号+英文船名+航次', '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('KKC', '神原汽船', 'Kambara Kisen', 'KMBU', 'KKC', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('KMT', '高丽', 'KMTC', 'KMTC', 'KMTC', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('KWE', '近铁', 'Kintetsu World Express', 'KWEU', 'KWE', true, false, false, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('MAT', '美森', 'Matson', 'MATS', 'MATS', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('MCC', 'MCC运输', 'MCC Transport', 'MCPU', 'MSK', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('MSC', '地中海', 'Mediterranean Shipping Company', 'MEDU', 'MSC', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('MSK', '马士基', 'Maersk', 'MAEU', 'MSK', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('MAERSK', '马士基', 'Maersk', 'MAEU', 'MSK', true, true, true, NULL, NULL, NULL, 'ACTIVE', '同MSK，Excel常用MAERSK', '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('NGP', '太古船务', 'NGPL', 'NGPL', 'NGPL', true, true, false, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('NDS', '尼罗河', 'Nile Dutch', 'NDSU', 'HPL', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('NOS', '宁波远洋外贸', 'NOSCO', 'NOSC', 'NOSCO', false, true, false, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('NSS', '南星', 'Namsung Shipping', 'NSSC', 'NSS', false, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('ONE', '海洋网联', 'Ocean Network Express', 'ONEY', 'ONE', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('OOL', '东方海外', 'OOCL', 'OOLU', 'OOCL', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('PCL', '泛洲', 'Pan Continental', 'PCLC', 'PCL', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('PIL', '太平', 'PIL', 'PABV', 'PIL', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('RCL', '宏海', 'RCL', 'RCLC', 'RCL', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('SAF', '萨非', 'Safmarine', 'SEAU', 'MSK', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('SLS', '海领', 'Sealead', 'SJHH', 'SEALEAD', false, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('SNL', '中外运', 'Sino Shipping', 'SNTU', 'SINO', false, true, true, NULL, NULL, NULL, 'ACTIVE', 'Requires 提单号+箱号', '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('SMM', '森罗', 'Sinokor', 'SKMC', 'SINOKOR', false, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('SIT', '海丰', 'SITC', 'SITC', 'SITC', false, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('SML', '森罗', 'SML', 'SMLM', 'SML', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('STX', '世腾', 'STX', 'POBU', 'STX', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('TAR', '塔罗斯', 'Tarros', 'GETU', 'TARROS', false, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('TCL', '太仓', 'Taicang Container', 'TCLC', 'TCLC', false, true, false, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('TSL', '德翔', 'TS Lines', 'TSYN', 'TSL', false, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('USL', '美国轮船', 'United States Lines', 'USLC', 'CMA', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('WHL', '万海', 'Wan Hai Lines', 'WHLC', 'WHL', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('YML', '阳明', 'Yang Ming', 'YMJA', 'YML', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('ZIM', '以星', 'ZIM', 'ZIMU', 'ZIM', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('ZSH', '中谷外贸', 'ZSH', 'ZSHC', 'ZSH', false, true, false, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('FES', '俄远东', 'FESCO', 'FESO', 'FESCO', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('MEL', '玛里亚那', 'Mariana Express', 'MELL', 'MARIANA', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('HDW', '合德', 'Hede', 'HDUJ', 'HEDE', false, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('DYS', '东映', 'Dong Young', 'DYSL', 'DYS', false, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('DJS', '东进', 'Dongjin', 'DJSL', 'DJS', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('SIF', '仁川', 'SIF', 'SIMP', 'SIF', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('MSS', '民生', 'Minsheng', 'MSKM', 'MINSHENG', false, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('TSH', '泰赢', 'Tailwind', 'TSHG', 'TAILWIND', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('ALX', '阿拉丁', 'Aladdin', 'ALXU', 'ALX', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('UGL', '联合环球', 'UGL', 'UGLU', 'UGL', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('OVP', '海液通', 'OVP', 'OVPB', 'OVP', false, true, false, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('ARKAS', '阿尔卡斯', 'Arkas', 'ARKU', 'ARKAS', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('EPANASIA', '泛亚内贸', 'Pan-Asia Domestic', 'COSU', 'COSCO', false, true, true, NULL, NULL, NULL, 'ACTIVE', '内贸航线', '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('ZSH_D', '中谷内贸', 'ZSH Domestic', 'ZSHC', 'ZSH', false, true, false, NULL, NULL, NULL, 'ACTIVE', '内贸航线', '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('ATL', '安通内贸', 'Antong Domestic', 'ATLC', 'ATL', false, true, false, NULL, NULL, NULL, 'ACTIVE', '内贸航线', '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('TRAWIND', '信风内贸', 'Tailwind Domestic', 'TRAW', 'TRAWIND', false, true, false, NULL, NULL, NULL, 'ACTIVE', '内贸航线', '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('NOSCO_D', '宁波远洋内贸', 'NOSCO Domestic', 'NOSC', 'NOSCO', false, true, false, NULL, NULL, NULL, 'ACTIVE', '内贸航线', '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('SAMUDERA', '萨姆达拉', 'Samudera', 'SIKU', 'SAMUDERA', false, true, false, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('JIHANG', '吉航海运', 'Jihang', 'JIHA', 'JIHANG', false, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('NNL', '新新航运', 'NNSL', 'NNSP', 'NNL', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('KANWAY', '建华海运', 'Kanway', 'UNKN', 'KANWAY', false, false, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('VOLTA', '瓦尔塔', 'Volta', 'VOLT', 'VOLTA', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('DSV', '丹麦物流', 'DSV', 'DFDS', 'DSV', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('BEN', '边航轮船', 'BEN Line', 'BENU', 'BEN', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('CCL', '中通航运', 'CCL', 'CCLU', 'CCL', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('EAS', '达通航运', 'East Asia', 'EASC', 'EAS', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('XPRESS', 'X-Express', 'X-Press-Feeder', 'XPRS', 'XPRESS', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('YCKY', '优成凯运', 'YCKY', 'YCKY', 'YCKY', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('KAWA', '嘉华航运', 'Kawa', 'KAWA', 'KAWA', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('FPMC', '台塑航运', 'FPMC', 'FPMC', 'FPMC', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('SACO', '中美合作', 'SACO', 'SACO', 'SACO', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('SETH', '狮富海运', 'Seth', 'SSPH', 'SETH', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('SHIPCO', '世舶科', 'Shipco', 'SHCO', 'SHIPCO', true, true, false, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('UNIFEEDER', '优尼菲尔德', 'Unifeeder', 'UNFR', 'UNIFEEDER', false, true, true, NULL, NULL, NULL, 'ACTIVE', '暂不支持', '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('WEC', '荷兰航运', 'WEC', 'WECL', 'WEC', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('SLG', '海杰航运', 'SLG', 'SLGS', 'SLG', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('ASL', '亚海', 'ASL', 'ASLU', 'ASL', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('NZL', '新西兰航运', 'NZL', 'NZLU', 'NZL', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('HSL', '韩星航运', 'HSL', 'HSLU', 'HSL', false, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');
INSERT INTO public.dict_shipping_companies VALUES ('WHDT', '武汉大通', 'Wuhan Datong', 'WHDT', 'WHDT', true, true, true, NULL, NULL, NULL, 'ACTIVE', NULL, '2026-03-24 10:45:37.236637', '2026-03-24 10:45:37.236637');


--
-- Data for Name: dict_trucking_companies; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.dict_trucking_companies VALUES ('JK_EXPRESS_USA_INC', 'JK EXPRESS USA INC', 'JK EXPRESS USA INC', NULL, NULL, 'ACTIVE', 10, 10, true, 10, NULL, '2026-03-24 10:58:17.927068', '2026-03-24 10:59:07.989793', 'US', 'NORMAL');
INSERT INTO public.dict_trucking_companies VALUES ('RT_LOGISTICA_SRL_', 'RT LOGISTICA Srl,', 'RT LOGISTICA Srl,', NULL, NULL, 'ACTIVE', 10, 10, true, 5, NULL, '2026-03-24 10:58:17.748329', '2026-03-24 10:59:07.701531', 'IT', 'NORMAL');
INSERT INTO public.dict_trucking_companies VALUES ('DSV_AIR___SEA_SAS', 'DSV Air & Sea SAS', 'DSV Air & Sea SAS', NULL, NULL, 'ACTIVE', 10, 10, false, NULL, NULL, '2026-03-24 10:58:17.772194', '2026-03-24 10:59:07.734387', 'IT', 'NORMAL');
INSERT INTO public.dict_trucking_companies VALUES ('ATLANTIC_FORWARDING_SPAIN__S_L_', 'Atlantic Forwarding Spain, S.L.', 'Atlantic Forwarding Spain, S.L.', NULL, NULL, 'ACTIVE', 10, 10, false, NULL, NULL, '2026-03-24 10:58:17.613738', '2026-03-24 10:59:07.49324', 'ES', 'NORMAL');
INSERT INTO public.dict_trucking_companies VALUES ('INTERFRACHT_CONTAINER_OVERSEAS_SERVICE_GMBH', 'INTERFRACHT Container Overseas Service GmbH', 'INTERFRACHT Container Overseas Service GmbH', NULL, NULL, 'ACTIVE', 10, 10, true, 40, NULL, '2026-03-24 10:58:17.595369', '2026-03-24 10:59:07.459932', 'DE', 'NORMAL');
INSERT INTO public.dict_trucking_companies VALUES ('S_AND_R_TRUCKING', 'S AND R TRUCKING', 'S AND R TRUCKING', NULL, NULL, 'ACTIVE', 10, 10, false, NULL, NULL, '2026-03-24 10:58:17.550125', '2026-03-24 10:59:07.386063', 'CA', 'NORMAL');
INSERT INTO public.dict_trucking_companies VALUES ('PORTGUYS_LOGISTICS_LLC', 'Portguys Logistics Llc', 'Portguys Logistics Llc', NULL, NULL, 'ACTIVE', 10, 10, false, NULL, NULL, '2026-03-24 10:58:17.960788', '2026-03-24 10:59:08.054187', 'US', 'NORMAL');
INSERT INTO public.dict_trucking_companies VALUES ('LC_LOGISTICS_SERVICES__INC', 'LC Logistics Services, Inc', 'LC Logistics Services, Inc', NULL, NULL, 'ACTIVE', 10, 10, true, 10, NULL, '2026-03-24 10:58:17.885368', '2026-03-24 10:59:07.900602', 'US', 'NORMAL');
INSERT INTO public.dict_trucking_companies VALUES ('LFT_TRANSPORTATION_INC', 'LFT TRANSPORTATION INC', 'LFT TRANSPORTATION INC', NULL, NULL, 'ACTIVE', 10, 10, false, NULL, NULL, '2026-03-24 10:58:17.941898', '2026-03-24 10:59:08.024608', 'US', 'NORMAL');
INSERT INTO public.dict_trucking_companies VALUES ('WENGER_TRUCKING_LLC', 'WENGER TRUCKING LLC', 'WENGER TRUCKING LLC', NULL, NULL, 'ACTIVE', 10, 10, false, NULL, NULL, '2026-03-24 10:58:17.980754', '2026-03-24 10:59:08.089738', 'US', 'NORMAL');
INSERT INTO public.dict_trucking_companies VALUES ('EV_CARGO_GLOBAL_FORWARDING', 'EV CARGO GLOBAL FORWARDING', 'EV CARGO GLOBAL FORWARDING', NULL, NULL, 'ACTIVE', 10, 10, true, 30, NULL, '2026-03-24 10:58:17.722378', '2026-03-24 10:59:07.667103', 'FR', 'NORMAL');
INSERT INTO public.dict_trucking_companies VALUES ('SHANGHAI_FLYING_FISH_SUPPLY_CHAIN_TECHNOLOGY_CO__L', 'SHANGHAI FLYING FISH SUPPLY CHAIN TECHNOLOGY CO.,L', 'SHANGHAI FLYING FISH SUPPLY CHAIN TECHNOLOGY CO.,L', NULL, NULL, 'ACTIVE', 10, 10, true, 10, NULL, '2026-03-24 10:58:17.836323', '2026-03-24 10:59:07.828124', 'US', 'NORMAL');
INSERT INTO public.dict_trucking_companies VALUES ('YUNEXPRESS_UK_LTD', 'YunExpress UK Ltd', 'YunExpress UK Ltd', NULL, NULL, 'ACTIVE', 10, 10, true, 200, NULL, '2026-03-24 10:58:17.809981', '2026-03-24 10:59:07.797834', 'GB', 'NORMAL');
INSERT INTO public.dict_trucking_companies VALUES ('NB_JIAVIEW_USA_INC', 'NB JIAVIEW USA INC', 'NB JIAVIEW USA INC', NULL, NULL, 'ACTIVE', 10, 10, true, 5, NULL, '2026-03-24 10:58:17.856819', '2026-03-24 10:59:07.866412', 'US', 'NORMAL');
INSERT INTO public.dict_trucking_companies VALUES ('TRANS_PRO_LOGISTIC_INC', 'TRANS PRO LOGISTIC INC', 'TRANS PRO LOGISTIC INC', NULL, NULL, 'ACTIVE', 10, 10, true, 200, NULL, '2026-03-24 10:58:17.574899', '2026-03-24 10:59:07.429663', 'CA', 'NORMAL');
INSERT INTO public.dict_trucking_companies VALUES ('CEVA_FREIGHT__UK__LTD', 'CEVA Freight (UK) Ltd', 'CEVA Freight (UK) Ltd', NULL, NULL, 'ACTIVE', 10, 10, false, NULL, NULL, '2026-03-24 10:58:17.792028', '2026-03-24 10:59:07.767058', 'GB', 'NORMAL');
INSERT INTO public.dict_trucking_companies VALUES ('JL_MANAGEMENT_USA_INC_', 'JL MANAGEMENT USA INC.', 'JL MANAGEMENT USA INC.', NULL, NULL, 'ACTIVE', 10, 10, true, 10, NULL, '2026-03-24 10:58:17.90852', '2026-03-24 10:59:07.944291', 'US', 'NORMAL');
INSERT INTO public.dict_trucking_companies VALUES ('XPO_GLOBAL_FORWARDING_FRANCE', 'XPO GLOBAL FORWARDING FRANCE', 'XPO GLOBAL FORWARDING FRANCE', NULL, NULL, 'ACTIVE', 10, 10, true, 30, NULL, '2026-03-24 10:58:17.677988', '2026-03-24 10:59:07.600655', 'FR', 'NORMAL');
INSERT INTO public.dict_trucking_companies VALUES ('GEODIS_FF_FRANCE', 'GEODIS FF FRANCE', 'GEODIS FF FRANCE', NULL, NULL, 'ACTIVE', 10, 10, true, 30, NULL, '2026-03-24 10:58:17.701036', '2026-03-24 10:59:07.632222', 'FR', 'NORMAL');
INSERT INTO public.dict_trucking_companies VALUES ('LEGENDRE_CELTIC', 'LEGENDRE CELTIC', 'LEGENDRE CELTIC', NULL, NULL, 'ACTIVE', 10, 10, true, 25, NULL, '2026-03-24 10:58:17.65474', '2026-03-24 10:59:07.565356', 'FR', 'NORMAL');
INSERT INTO public.dict_trucking_companies VALUES ('ALPHA_CARGO_INTEMATIONAL_LOGISTICS', 'ALPHA CARGO INTEMATIONAL LOGISTICS', 'ALPHA CARGO INTEMATIONAL LOGISTICS', NULL, NULL, 'ACTIVE', 10, 10, true, 50, NULL, '2026-03-24 10:58:17.632622', '2026-03-24 10:59:07.533069', 'FR', 'NORMAL');
INSERT INTO public.dict_trucking_companies VALUES ('TRUCK_TEST_001', 'Test Trucking Company A', NULL, NULL, NULL, NULL, 20, 20, true, NULL, NULL, '2026-03-31 06:41:20.447361', '2026-03-31 06:41:20.447361', NULL, 'NORMAL');
INSERT INTO public.dict_trucking_companies VALUES ('TRUCK_TEST_002', 'Test Trucking Company B', NULL, NULL, NULL, NULL, 15, 15, false, NULL, NULL, '2026-03-31 06:41:20.447361', '2026-03-31 06:41:20.447361', NULL, 'NORMAL');


--
-- Data for Name: dict_warehouses; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.dict_warehouses VALUES ('CA-P003', 'FBW_CA', 'FBW_CA', 'FBW_CA', '平台仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('CA-S003', 'Oshawa', 'Oshawa', 'Oshawa', '自营仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('CA-S004', 'Elora', 'Elora', 'Elora', '自营仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('CA-S005', 'Oshawa RMA&Parts', 'Oshawa RMA&Parts', 'Oshawa RMA&Parts', '自营仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('CA-S006', 'Milton', 'Milton', 'Milton', '自营仓', 'NORMAL', 'AOSOM_CA', '8119 Trafalgar Rd, Halton Hills, ON L0P 1E0', '', '', 'CA', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('CA-T001', '3PL-Oshawa-GC', '3PL-Oshawa-GC', '3PL-Oshawa-GC', '第三方仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('CA-T002', 'Oshawa 18WL', 'Oshawa 18WL', 'Oshawa 18WL', '第三方仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('CA-T003', 'Calgary 18WL', 'Calgary 18WL', 'Calgary 18WL', '第三方仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('CA-T004', 'Oshawa 18WL 1', 'Oshawa 18WL 1', 'Oshawa 18WL 1', '第三方仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('CA-T005', 'Calgary 18WL 1', 'Calgary 18WL 1', 'Calgary 18WL 1', '第三方仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('CA-T006', 'Oshawa 18WL 2', 'Oshawa 18WL 2', 'Oshawa 18WL 2', '第三方仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('CA-T007', 'Oshawa 18WL 3', 'Oshawa 18WL 3', 'Oshawa 18WL 3', '第三方仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('CA-T008', 'Oshawa 18WL 4', 'Oshawa 18WL 4', 'Oshawa 18WL 4', '第三方仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('CA-T009', 'Oshawa 18WL 5', 'Oshawa 18WL 5', 'Oshawa 18WL 5', '第三方仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('CA-T010', 'Oshawa 18WL 6', 'Oshawa 18WL 6', 'Oshawa 18WL 6', '第三方仓', 'NORMAL', 'AOSOM_CA', '', 'Oshawa 18WL 6', '', 'CA', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('CA-T011', '3PL Toronto-DM', '3PL Toronto-DM', '3PL Toronto-DM', '第三方仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('CA-T012', '3PL Vancouver-DM', '3PL Vancouver-DM', '3PL Vancouver-DM', '第三方仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('CA-T013', '3PL Toronto-MSK', '3PL Toronto-MSK', '3PL Toronto-MSK', '第三方仓', 'NORMAL', 'AOSOM_CA', '12333 Airport Road, Caledon, ON L7C 2X3', '', '', 'CA', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('CA-T014', '3PL Toronto-EDA', '3PL Toronto-EDA', '3PL Toronto-EDA', '第三方仓', 'NORMAL', 'AOSOM_CA', 'Tonolli Rd #2, Mississauga, ON L4Y 4C2', '', '', 'CA', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('CA-T014-3PL', 'CLG02 3PL', 'CLG02 3PL', 'CLG02 3PL', '第三方仓', 'NORMAL', 'AOSOM_CA', '5020 72 Ave SE, Calgary, AB T2C 4B5', '', '', 'CA', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('CA-T015', '3PL Calgary-RIG', '3PL Calgary-RIG', '3PL Calgary-RIG', '第三方仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('CA001', 'Toronto Store', 'Toronto Store', 'Toronto Store', '自营仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('CA002', 'Toronto_new', 'Toronto_new', 'Toronto_new', '自营仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('CA003', 'FBA_CA', 'FBA_CA', 'FBA_CA', '平台仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('CA004', 'Wayfair Mississauga', 'Wayfair Mississauga', 'Wayfair Mississauga', '平台仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('CA005', 'CLG01', 'CLG01', 'CLG01', '自营仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('DE-S003', 'Schwan', 'Schwan', 'Schwan', '自营仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('DE-S004', 'Rade 2', 'Rade 2', 'Rade 2', '自营仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('DE-T001', 'CHE', 'CHE', 'CHE', '第三方仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('DE-T002', 'New Returns BV', 'New Returns BV', 'New Returns BV', '第三方仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('DE-T003', 'Galan', 'Galan', 'Galan', '第三方仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('DE-T004', '3PL DE-GC', '3PL DE-GC', '3PL DE-GC', '第三方仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('DE-T005', 'Galan New Warehouse', 'Galan New Warehouse', 'Galan New Warehouse', '第三方仓', 'NORMAL', 'MH_DE', 'Jana Śniadeckiego 25，72102,Stargard，zachodniopomorskie', '', '', 'DE', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('DE-T006', '3PL DE-Sph', '3PL DE-Sph', '3PL DE-Sph', '第三方仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('DE-T007', '3PL DE-DHL', '3PL DE-DHL', '3PL DE-DHL', '第三方仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('DE-T008', '3PL DE-Phe', '3PL DE-Phe', '3PL DE-Phe', '第三方仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('GE001', 'Stuhr', 'Stuhr', 'Stuhr', '自营仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('GE002', 'Amazon FBA', 'Amazon FBA', 'Amazon FBA', '平台仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('GE003', 'Bremen_new', 'Bremen_new', 'Bremen_new', '自营仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('GE004', 'Soller_Bremen', 'Soller_Bremen', 'Soller_Bremen', '自营仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('GE005', 'Compact', 'Compact', 'Compact', '自营仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('GE006', 'Vechta', 'Vechta', 'Vechta', '自营仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('GE007', 'Wayfair_CG', 'Wayfair_CG', 'Wayfair_CG', '平台仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('GE008', 'HMB01', 'HMB01', 'HMB01', '自营仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('GE009', 'Aosom Virtual', 'Aosom Virtual', 'Aosom Virtual', '自营仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('ES-T001', 'Worten', 'Worten', 'Worten', '第三方仓', 'NORMAL', 'AOSOM_ES', '', '', '', 'ES', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('ES001', 'Barcelona', 'Barcelona', 'Barcelona', '第三方仓', 'NORMAL', 'AOSOM_ES', '', '', '', 'ES', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('ES002', 'Amazon FBA', 'Amazon FBA', 'Amazon FBA', '平台仓', 'NORMAL', 'AOSOM_ES', '', '', '', 'ES', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('ES003', 'BAL', 'BAL', 'BAL', '自营仓', 'NORMAL', 'AOSOM_ES', '', '', '', 'ES', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('ES004', 'ND', 'ND', 'ND', '第三方仓', 'NORMAL', 'AOSOM_ES', '', '', '', 'ES', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('ES005', 'Monechelle_ES', 'Monechelle_ES', 'Monechelle_ES', '平台仓', 'NORMAL', 'AOSOM_ES', '', '', '', 'ES', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('ES006', 'SLT', 'SLT', 'SLT', '自营仓', 'NORMAL', 'AOSOM_ES', '', '', '', 'ES', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('ES007', 'VLS', 'VLS', 'VLS', '自营仓', 'NORMAL', 'AOSOM_ES', '', '', '', 'ES', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('ES008', 'Aosom Virtual', 'Aosom Virtual', 'Aosom Virtual', '自营仓', 'NORMAL', 'AOSOM_ES', '', '', '', 'ES', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('SP2-S001', 'SP2-S001', 'SP2-S001', 'SP2-S001', '自营仓', 'NORMAL', 'AOSOM_ES', '', '', '', 'ES', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('FR-S004', 'ART', 'ART', 'ART', '自营仓', 'NORMAL', 'MH_FR', '', '', '', 'FR', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('FR001', 'MH France Oissel', 'MH France Oissel', 'MH France Oissel', '自营仓', 'NORMAL', 'MH_FR', '', '', '', 'FR', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('FR002', 'Amazon FBA', 'Amazon FBA', 'Amazon FBA', '平台仓', 'NORMAL', 'MH_FR', '', '', '', 'FR', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('FR003', 'MH France Roncq', 'MH France Roncq', 'MH France Roncq', '自营仓', 'NORMAL', 'MH_FR', '', '', '', 'FR', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('FR004', 'FBA Cdiscount', 'FBA Cdiscount', 'FBA Cdiscount', '平台仓', 'NORMAL', 'MH_FR', '', '', '', 'FR', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('FR006', 'FR_Virtual', 'FR_Virtual', 'FR_Virtual', '自营仓', 'NORMAL', 'MH_FR', '', '', '', 'FR', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('FR007', 'LEH01', 'LEH01', 'LEH01', '自营仓', 'NORMAL', 'MH_FR', '', '', '', 'FR', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('FR008', 'Mer', 'Mer', 'Mer', '自营仓', 'NORMAL', 'MH_FR', '', '', '', 'FR', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('FR05', 'Mon Echelle FBM', 'Mon Echelle FBM', 'Mon Echelle FBM', '平台仓', 'NORMAL', 'MH_FR', '', '', '', 'FR', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('GCC_701', 'Vendor Warehouse', 'Vendor Warehouse', 'Vendor Warehouse', '自营仓', 'NORMAL', 'AOSOM_RO', '', '', '', 'RO', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('RO-T001', '3PL RO-DSV', '3PL RO-DSV', '3PL RO-DSV', '第三方仓', 'NORMAL', 'AOSOM_RO', '', '', '', 'RO', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('RO-T002', '3PL RO-FAN', '3PL RO-FAN', '3PL RO-FAN', '第三方仓', 'NORMAL', 'AOSOM_RO', '', '', '', 'RO', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('RO001', 'RO001', 'RO001', 'RO001', '自营仓', 'NORMAL', 'AOSOM_RO', '', '', '', 'RO', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('IE-P001', 'Amazon FBA_IE', 'Amazon FBA_IE', 'Amazon FBA_IE', '平台仓', 'NORMAL', 'AOSOM_IE', '', '', '', 'IE', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('IE-S001', 'Greenogue', 'Greenogue', 'Greenogue', '自营仓', 'NORMAL', 'AOSOM_IE', '', '', '', 'IE', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('IE001', 'Ireland', 'Ireland', 'Ireland', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'IE', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('IT-S002', 'BLG', 'BLG', 'BLG', '自营仓', 'NORMAL', 'AOSOM_IT', '', '', '', 'IT', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('IT-S003', 'AL', 'AL', 'AL', '自营仓', 'NORMAL', 'AOSOM_IT', '', '', '', 'IT', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('IT-S004', 'POZ', 'POZ', 'POZ', '自营仓', 'NORMAL', 'AOSOM_IT', '', '', '', 'IT', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('IT-T002', 'DSV', 'DSV', 'DSV', '第三方仓', 'NORMAL', 'AOSOM_IT', '', '', '', 'IT', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('IT-T003', '3PL IT-FAN', '3PL IT-FAN', '3PL IT-FAN', '第三方仓', 'NORMAL', 'AOSOM_IT', '', '', '', 'IT', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('IT001', 'BRT Servizi Logistici', 'BRT Servizi Logistici', 'BRT Servizi Logistici', '自营仓', 'NORMAL', 'AOSOM_IT', '', '', '', 'IT', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('IT002', 'SITAF', 'SITAF', 'SITAF', '自营仓', 'NORMAL', 'AOSOM_IT', '', '', '', 'IT', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('IT003', 'Amazon FBA', 'Amazon FBA', 'Amazon FBA', '平台仓', 'NORMAL', 'AOSOM_IT', '', '', '', 'IT', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('IT004', 'KN', 'KN', 'KN', '自营仓', 'NORMAL', 'AOSOM_IT', '', '', '', 'IT', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('IT005', 'KN-Marketplace', 'KN-Marketplace', 'KN-Marketplace', '自营仓', 'NORMAL', 'AOSOM_IT', '', '', '', 'IT', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('IT006', 'eMag', 'eMag', 'eMag', '平台仓', 'NORMAL', 'AOSOM_IT', '', '', '', 'IT', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('IT007', 'FRISBO', 'FRISBO', 'FRISBO', '自营仓', 'NORMAL', 'AOSOM_IT', '', '', '', 'IT', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('IT008', 'FBM', 'FBM', 'FBM', '平台仓', 'NORMAL', 'AOSOM_IT', '', '', '', 'IT', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('IT009', 'BRT TORINO', 'BRT TORINO', 'BRT TORINO', '自营仓', 'NORMAL', 'AOSOM_IT', '', '', '', 'IT', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('IT2-S001', 'IT2-S001', 'IT2-S001', 'IT2-S001', '自营仓', 'NORMAL', 'AOSOM_IT', '', '', '', 'IT', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('UK-S003', 'Bedford3', 'Bedford3', 'Bedford3', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('UK-S004', 'Bedford 2', 'Bedford 2', 'Bedford 2', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('UK-S005', 'Bedford', 'Bedford', 'Bedford', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('UK-S006', 'Nampton', 'Nampton', 'Nampton', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('UK-S007', 'Nampton 2', 'Nampton 2', 'Nampton 2', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('UK-S008', 'Nampton 3', 'Nampton 3', 'Nampton 3', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('UK-T001', '3PL UK-GC', '3PL UK-GC', '3PL UK-GC', '第三方仓', 'NORMAL', 'MH_UK', '3PL UK-GC', '', '', 'GB', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('UK-T002', '3PL UK-WT', '3PL UK-WT', '3PL UK-WT', '第三方仓', 'NORMAL', 'MH_UK', '3PL UK-WT', '', '', 'GB', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('UK-T003', '3PL UK-WG', '3PL UK-WG', '3PL UK-WG', '第三方仓', 'NORMAL', 'MH_UK', '3PL UK-WG', '', '', 'GB', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('UK-T004', 'JKO', 'JKO', 'JKO', '第三方仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('UK-T005', '3PL UK-BID', '3PL UK-BID', '3PL UK-BID', '第三方仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('UK-T006', '3PL UK-CW', '3PL UK-CW', '3PL UK-CW', '第三方仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('UK001', 'Guildford_Invalid', 'Guildford_Invalid', 'Guildford_Invalid', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('UK002', 'Anchor', 'Anchor', 'Anchor', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('UK003', 'CWL_Invalid', 'CWL_Invalid', 'CWL_Invalid', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('UK004', 'Perivale', 'Perivale', 'Perivale', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('UK005', 'St. Neots', 'St. Neots', 'St. Neots', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('UK006', 'Amazon FBA_UK', 'Amazon FBA_UK', 'Amazon FBA_UK', '平台仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('UK007', 'PD PORTS', 'PD PORTS', 'PD PORTS', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('UK008', 'CASTLE GATE', 'CASTLE GATE', 'CASTLE GATE', '平台仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('UK009', 'Doncaster', 'Doncaster', 'Doncaster', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('UK010', 'Wayfair Lutterworth', 'Wayfair Lutterworth', 'Wayfair Lutterworth', '平台仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('UK011', 'SP01', 'SP01', 'SP01', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('UK012', 'UK-GC', 'UK-GC', 'UK-GC', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('UK013', 'Carlton Forest', 'Carlton Forest', 'Carlton Forest', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('UK014', 'PTB', 'PTB', 'PTB', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US-P007', 'Wayfair Hebron', 'Wayfair Hebron', 'Wayfair Hebron', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US-P008', 'Wayfair Perris (LP)/Perris2 (SP)', 'Wayfair Perris', 'Wayfair Perris', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US-P009', 'Wayfair Port Wentworth', 'Wayfair Port Wentworth', 'Wayfair Port Wentworth', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US-P010', 'Wayfair Aberdeen', 'Wayfair Aberdeen', 'Wayfair Aberdeen', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US-P011', 'Wayfair Savannah', 'Wayfair Savannah', 'Wayfair Savannah', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US-P012', 'Wayfair SantaFeSprings', 'Wayfair SantaFeSprings', 'Wayfair SantaFeSprings', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US-P013', 'Wayfair Romeoville', 'Wayfair Romeoville', 'Wayfair Romeoville', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US-P014', 'Wayfair Pre Bonded', 'Wayfair Pre Bonded', 'Wayfair Pre Bonded', '平台仓', 'NORMAL', 'AOSOM_US', '', 'US-P014', '', 'US', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US-S005', 'AOSOM CA-1', 'AOSOM CA-1', 'AOSOM CA-1', '自营仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US-T004', '3PL-NJ-Cope', '3PL-NJ-Cope', '3PL-NJ-Cope', '第三方仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US-T005', '3PL CA-iCargo', '3PL CA-iCargo', '3PL CA-iCargo', '第三方仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US-T006', '3PL-CA-LC', '3PL-CA-LC', '3PL-CA-LC', '第三方仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US001', 'OLD_PDX Store', 'OLD_PDX Store', 'OLD_PDX Store', '自营仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US002', 'AOSOM TN-1', 'AOSOM TN-1', 'AOSOM TN-1', '自营仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US003', 'Memphis_temp', 'Memphis_temp', 'Memphis_temp', '自营仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US004', 'OLD_PDX_temp', 'OLD_PDX_temp', 'OLD_PDX_temp', '自营仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US005', 'AOSOM OR-1', 'AOSOM OR-1', 'AOSOM OR-1', '自营仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US006', 'AOSOM TN-2', 'AOSOM TN-2', 'AOSOM TN-2', '自营仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US007', 'Amazon 3PL', 'Amazon 3PL', 'Amazon 3PL', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US008', 'Wayfair 3PL', 'Wayfair 3PL', 'Wayfair 3PL', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US009', 'Wayfair McDonough', 'Wayfair McDonough', 'Wayfair McDonough', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US010', 'Wayfair Cranbury (LP)/Cranbury 2', 'Wayfair Cranbury', 'Wayfair Cranbury', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US011', 'Wayfair Erlanger', 'Wayfair Erlanger', 'Wayfair Erlanger', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US012', 'Overstock 3PL', 'Overstock 3PL', 'Overstock 3PL', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US013', 'Wayfair Lancaster', 'Wayfair Lancaster', 'Wayfair Lancaster', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US014', 'Wayfair Lathrop', 'Wayfair Lathrop', 'Wayfair Lathrop', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US015', 'Walmart 3PL', 'Walmart 3PL', 'Walmart 3PL', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US016', 'AOSOM NJ-1', 'AOSOM NJ-1', 'AOSOM NJ-1', '自营仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US017', '3PL NJ-LC', '3PL NJ-LC', '3PL NJ-LC', '第三方仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US018', 'AOSOM GA-1', 'AOSOM GA-1', 'AOSOM GA-1', '自营仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US019', '3PL LA-JD', '3PL LA-JD', '3PL LA-JD', '第三方仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US020', '3PL NJ-KS', '3PL NJ-KS', '3PL NJ-KS', '第三方仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '第三方仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US021', 'Wayfair Jacksonville', 'Wayfair Jacksonville', 'Wayfair Jacksonville', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '平台仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US022', 'AOSOM TN-Parts', 'AOSOM TN-Parts', 'AOSOM TN-Parts', '自营仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US023', 'Aosom Virtual', 'Aosom Virtual', 'Aosom Virtual', '自营仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('US024', 'AOSOM GA-Parts', 'AOSOM GA-Parts', 'AOSOM GA-Parts', '自营仓', 'NORMAL', 'AOSOM_US', '', 'AOSOM GA-Parts', '', 'US', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');
INSERT INTO public.dict_warehouses VALUES ('PT001', 'PT001', 'PT001', 'PT001', '自营仓', 'NORMAL', 'AOSOM_ES', '', '', '', 'PT', NULL, NULL, 'ACTIVE', 10, '自营仓库', '2026-03-24 10:45:37.864554', '2026-03-24 10:45:37.864554');


--
-- PostgreSQL database dump complete
--

