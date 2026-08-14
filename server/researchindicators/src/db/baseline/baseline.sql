-- MySQL dump 10.13  Distrib 8.0.46, for Linux (aarch64)
--
-- Host: 192.168.20.210    Database: alliancereportingdb
-- ------------------------------------------------------
-- Server version	8.0.45-0ubuntu0.22.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `AICCRA_basic_metadata`
--

DROP TABLE IF EXISTS `AICCRA_basic_metadata`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AICCRA_basic_metadata` (
  `type` varchar(50) DEFAULT NULL,
  `id` int DEFAULT NULL,
  `title` text,
  `year` smallint DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `institution_id` int DEFAULT NULL,
  `institution_name` varchar(500) DEFAULT NULL,
  `user_name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `levers` varchar(255) DEFAULT NULL,
  `active_since` datetime DEFAULT NULL,
  `marlo_link` text,
  `public_link` text,
  `STAR_indicator_type` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `AICCRA_inno_concacts`
--

DROP TABLE IF EXISTS `AICCRA_inno_concacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AICCRA_inno_concacts` (
  `id` bigint NOT NULL DEFAULT '0',
  `name` varchar(511) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `institution_id` bigint DEFAULT '0',
  `institution` text CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `AICCRA_inno_countries`
--

DROP TABLE IF EXISTS `AICCRA_inno_countries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AICCRA_inno_countries` (
  `id` bigint NOT NULL DEFAULT '0',
  `iso_alpha_3` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `AICCRA_inno_institutions`
--

DROP TABLE IF EXISTS `AICCRA_inno_institutions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AICCRA_inno_institutions` (
  `project_innovation_id` bigint DEFAULT NULL,
  `id_phase` bigint DEFAULT NULL,
  `institution_type_id` bigint NOT NULL DEFAULT '0',
  `institution_id` bigint NOT NULL DEFAULT '0',
  `institution_name` mediumtext CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `partner_role` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  `org_type` varchar(7) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  `institution_type` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `AICCRA_inno_references`
--

DROP TABLE IF EXISTS `AICCRA_inno_references`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AICCRA_inno_references` (
  `id` bigint NOT NULL DEFAULT '0',
  `url` longtext CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci,
  `Desciption` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `AICCRA_inno_regions`
--

DROP TABLE IF EXISTS `AICCRA_inno_regions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AICCRA_inno_regions` (
  `id` bigint NOT NULL DEFAULT '0',
  `iso_numeric` bigint DEFAULT NULL,
  `name` text CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `AICCRA_inno_sdgs`
--

DROP TABLE IF EXISTS `AICCRA_inno_sdgs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AICCRA_inno_sdgs` (
  `id` bigint NOT NULL DEFAULT '0',
  `smo_code` bigint DEFAULT NULL,
  `short_name` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `AICCRA_innovations`
--

DROP TABLE IF EXISTS `AICCRA_innovations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AICCRA_innovations` (
  `id` bigint NOT NULL DEFAULT '0',
  `link_innovation` varchar(133) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `year` bigint DEFAULT NULL,
  `title` text CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci,
  `short_title` text CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci,
  `narrative` text CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci,
  `innovation_nature_id` bigint DEFAULT NULL,
  `innovation_nature_name` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `other_innovation_nature` text CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci,
  `innovation_type_id` bigint DEFAULT '0',
  `innovation_type_name` text CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci,
  `prms_id_equivalent` bigint DEFAULT NULL,
  `prms_name_equivalent` text CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci,
  `scope_id` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `scope_name` mediumtext CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci,
  `readiness_score` bigint DEFAULT NULL,
  `readiness_name` text CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci,
  `user_name` varchar(511) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `active_since` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TEMP_external_oicrs`
--

DROP TABLE IF EXISTS `TEMP_external_oicrs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TEMP_external_oicrs` (
  `id` bigint NOT NULL,
  `title` text,
  `maturity_level` text,
  `report_year` text,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `result_status` text,
  `external_id` text,
  `handle_link` text,
  `main_contact_person_list` text,
  `elaboration_narrative` text,
  `lever_list` text,
  `geo_scope_id` bigint DEFAULT NULL,
  `country_list` text,
  `region_list` text,
  `geo_scope_comment` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TEMP_result_external_oicrs`
--

DROP TABLE IF EXISTS `TEMP_result_external_oicrs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TEMP_result_external_oicrs` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `result_id` bigint NOT NULL,
  `external_oicr_id` bigint NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=329 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_CD`
--

DROP TABLE IF EXISTS `TIP_CD`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_CD` (
  `CapDevId` int NOT NULL,
  `AgreementId` varchar(50) DEFAULT NULL,
  `SupName` varchar(255) DEFAULT NULL,
  `Suptaffid` varchar(255) DEFAULT NULL,
  `title` text,
  `start_date` varchar(20) DEFAULT NULL,
  `end_date` varchar(20) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `trainee` varchar(50) DEFAULT NULL,
  `gender` varchar(50) DEFAULT NULL,
  `total` int DEFAULT NULL,
  `non_binary` decimal(10,2) DEFAULT NULL,
  `male` decimal(10,2) DEFAULT NULL,
  `female` decimal(10,2) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `created_at` varchar(50) DEFAULT NULL,
  `updated_at` varchar(50) DEFAULT NULL,
  `url` varchar(255) DEFAULT NULL,
  `ResAreaName` varchar(255) DEFAULT NULL,
  `DegreeName` varchar(50) DEFAULT NULL,
  `reason_deny` varchar(255) DEFAULT NULL,
  `location` varchar(50) DEFAULT NULL,
  `length` varchar(50) DEFAULT NULL,
  `NationalityUN` decimal(10,2) DEFAULT NULL,
  `purpose` varchar(50) DEFAULT NULL,
  `LanguageCode` varchar(50) DEFAULT NULL,
  `behalf` tinyint DEFAULT NULL,
  `submitterName` varchar(50) DEFAULT NULL,
  `submitterEmail` varchar(255) DEFAULT NULL,
  `submitterID` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`CapDevId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_CD_Contacts`
--

DROP TABLE IF EXISTS `TIP_CD_Contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_CD_Contacts` (
  `capdev_id` int DEFAULT NULL,
  `name` varchar(50) DEFAULT NULL,
  `email` varchar(50) DEFAULT NULL,
  `carnet` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_CD_Files`
--

DROP TABLE IF EXISTS `TIP_CD_Files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_CD_Files` (
  `id_capdev` int DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `path` varchar(255) DEFAULT NULL,
  `size` int DEFAULT NULL,
  `id_file` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_CD_References`
--

DROP TABLE IF EXISTS `TIP_CD_References`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_CD_References` (
  `capdev_id` int DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `link` text,
  `disclose` tinyint DEFAULT NULL,
  `created_at` varchar(40) DEFAULT NULL,
  `updated_at` varchar(40) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_CD_affiliations`
--

DROP TABLE IF EXISTS `TIP_CD_affiliations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_CD_affiliations` (
  `CapDevId` int DEFAULT NULL,
  `institution_name` varchar(255) DEFAULT NULL,
  `url` varchar(255) DEFAULT NULL,
  `acronym` varchar(50) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `CountryUN` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_CD_countries`
--

DROP TABLE IF EXISTS `TIP_CD_countries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_CD_countries` (
  `capdev_id` int DEFAULT NULL,
  `un_code` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_CD_intellectual_property`
--

DROP TABLE IF EXISTS `TIP_CD_intellectual_property`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_CD_intellectual_property` (
  `id_capdev` int DEFAULT NULL,
  `property_alliance` tinyint DEFAULT NULL,
  `name_third_party` varchar(50) DEFAULT NULL,
  `restrictions` decimal(10,2) DEFAULT NULL,
  `publication_id` decimal(10,2) DEFAULT NULL,
  `potential_commercialization` decimal(10,2) DEFAULT NULL,
  `further_development` decimal(10,2) DEFAULT NULL,
  `property_owner` varchar(50) DEFAULT NULL,
  `has_disclosed_publicly` decimal(10,2) DEFAULT NULL,
  `disclosed_publicly_detail` text CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci,
  `disclosed_publicly_confidentiality_provisions` text CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_CD_organizations`
--

DROP TABLE IF EXISTS `TIP_CD_organizations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_CD_organizations` (
  `capdev_id` int DEFAULT NULL,
  `institution_name` varchar(255) DEFAULT NULL,
  `url` varchar(255) DEFAULT NULL,
  `acronym` varchar(50) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `CountryUN` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_CD_partners`
--

DROP TABLE IF EXISTS `TIP_CD_partners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_CD_partners` (
  `capdev_id` int DEFAULT NULL,
  `disclose` tinyint DEFAULT NULL,
  `institution_name` varchar(255) DEFAULT NULL,
  `url` varchar(255) DEFAULT NULL,
  `acronym` varchar(50) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `CountryUN` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_CLARISA_institutions`
--

DROP TABLE IF EXISTS `TIP_CLARISA_institutions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_CLARISA_institutions` (
  `tip_name` varchar(1000) DEFAULT NULL,
  `CLARISA_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_Knowledge_product`
--

DROP TABLE IF EXISTS `TIP_Knowledge_product`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_Knowledge_product` (
  `id` text COLLATE utf8mb4_unicode_ci,
  `Year` text COLLATE utf8mb4_unicode_ci,
  `ResAreaName` text COLLATE utf8mb4_unicode_ci,
  `collectionName` text COLLATE utf8mb4_unicode_ci,
  `AllianceAuthorship` text COLLATE utf8mb4_unicode_ci,
  `doi` text COLLATE utf8mb4_unicode_ci,
  `name` text COLLATE utf8mb4_unicode_ci,
  `citation` text COLLATE utf8mb4_unicode_ci,
  `badges` text COLLATE utf8mb4_unicode_ci,
  `link` text COLLATE utf8mb4_unicode_ci,
  `impactFactor` text COLLATE utf8mb4_unicode_ci,
  `accessible` text COLLATE utf8mb4_unicode_ci,
  `findable` text COLLATE utf8mb4_unicode_ci,
  `interoperable` text COLLATE utf8mb4_unicode_ci,
  `reusable` text COLLATE utf8mb4_unicode_ci,
  `ISI_Thomson` text COLLATE utf8mb4_unicode_ci,
  `openAccess` text COLLATE utf8mb4_unicode_ci,
  `peer_reviewed` text COLLATE utf8mb4_unicode_ci,
  `Agreement_id` text COLLATE utf8mb4_unicode_ci,
  `Description` text COLLATE utf8mb4_unicode_ci,
  `Country` text COLLATE utf8mb4_unicode_ci,
  `Region` text COLLATE utf8mb4_unicode_ci,
  `Author_id` text COLLATE utf8mb4_unicode_ci,
  `Author_name` text COLLATE utf8mb4_unicode_ci,
  `Author_email` text COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_LH_pub`
--

DROP TABLE IF EXISTS `TIP_LH_pub`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_LH_pub` (
  `pubYear` text COLLATE utf8mb4_unicode_ci,
  `id` text COLLATE utf8mb4_unicode_ci,
  `name` text COLLATE utf8mb4_unicode_ci,
  `citation` text COLLATE utf8mb4_unicode_ci,
  `issn` text COLLATE utf8mb4_unicode_ci,
  `impactFactor` text COLLATE utf8mb4_unicode_ci,
  `almetric_score` text COLLATE utf8mb4_unicode_ci,
  `badges` text COLLATE utf8mb4_unicode_ci,
  `ISI_Thomson` text COLLATE utf8mb4_unicode_ci,
  `openAccess` text COLLATE utf8mb4_unicode_ci,
  `ROMEO` text COLLATE utf8mb4_unicode_ci,
  `doi` text COLLATE utf8mb4_unicode_ci,
  `identifierURL` text COLLATE utf8mb4_unicode_ci,
  `link` text COLLATE utf8mb4_unicode_ci,
  `findable` text COLLATE utf8mb4_unicode_ci,
  `accessible` text COLLATE utf8mb4_unicode_ci,
  `interoperable` text COLLATE utf8mb4_unicode_ci,
  `reusable` text COLLATE utf8mb4_unicode_ci,
  `peer_reviewed` text COLLATE utf8mb4_unicode_ci,
  `impact_studies` text COLLATE utf8mb4_unicode_ci,
  `author_id` text COLLATE utf8mb4_unicode_ci,
  `Orcid` text COLLATE utf8mb4_unicode_ci,
  `Staffid` text COLLATE utf8mb4_unicode_ci,
  `AutName` text COLLATE utf8mb4_unicode_ci,
  `AutEmail` text COLLATE utf8mb4_unicode_ci,
  `OffiName` text COLLATE utf8mb4_unicode_ci,
  `ResAreaName` text COLLATE utf8mb4_unicode_ci,
  `author` text COLLATE utf8mb4_unicode_ci,
  `coAuthor` text COLLATE utf8mb4_unicode_ci,
  `lastAuthor` text COLLATE utf8mb4_unicode_ci,
  `isCiat` text COLLATE utf8mb4_unicode_ci,
  `AllianceAuthorship` text COLLATE utf8mb4_unicode_ci,
  `summary` text COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_inno_actor`
--

DROP TABLE IF EXISTS `TIP_inno_actor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_inno_actor` (
  `innovation_id` int DEFAULT NULL,
  `type` text,
  `m_youth` int DEFAULT NULL,
  `m_non_youth` int DEFAULT NULL,
  `f_youth` int DEFAULT NULL,
  `f_non_youth` int DEFAULT NULL,
  `n_youth` int DEFAULT NULL,
  `n_non_youth` int DEFAULT NULL,
  `comment` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_inno_collaborator`
--

DROP TABLE IF EXISTS `TIP_inno_collaborator`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_inno_collaborator` (
  `innovation_id` int DEFAULT NULL,
  `name` text,
  `email` text,
  `affiliation` text,
  `carnet` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_inno_contact`
--

DROP TABLE IF EXISTS `TIP_inno_contact`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_inno_contact` (
  `innovation_id` int DEFAULT NULL,
  `name` text,
  `email` text,
  `carnet` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_inno_countries`
--

DROP TABLE IF EXISTS `TIP_inno_countries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_inno_countries` (
  `innovation_id` int DEFAULT NULL,
  `un_code` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_inno_files`
--

DROP TABLE IF EXISTS `TIP_inno_files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_inno_files` (
  `innovation_id` int DEFAULT NULL,
  `file_id` varchar(100) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `path` varchar(255) DEFAULT NULL,
  `size` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_inno_impact_area`
--

DROP TABLE IF EXISTS `TIP_inno_impact_area`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_inno_impact_area` (
  `innovation_id` int DEFAULT NULL,
  `name` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_inno_intellectual_property`
--

DROP TABLE IF EXISTS `TIP_inno_intellectual_property`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_inno_intellectual_property` (
  `innovation_id` int DEFAULT NULL,
  `property_alliance` int DEFAULT NULL,
  `name_third_party` text,
  `restrictions` float DEFAULT NULL,
  `publication_id` float DEFAULT NULL,
  `potential_commercialization` text,
  `further_development` text,
  `property_owner` text,
  `has_disclosed_publicly` float DEFAULT NULL,
  `disclosed_publicly_detail` text,
  `disclosed_publicly_confidentiality_provisions` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_inno_levers`
--

DROP TABLE IF EXISTS `TIP_inno_levers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_inno_levers` (
  `innovation_id` int DEFAULT NULL,
  `ResAreaName` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_inno_main_contact`
--

DROP TABLE IF EXISTS `TIP_inno_main_contact`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_inno_main_contact` (
  `innovation_id` int DEFAULT NULL,
  `carnet` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_inno_organization`
--

DROP TABLE IF EXISTS `TIP_inno_organization`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_inno_organization` (
  `innovation_id` int DEFAULT NULL,
  `name` text,
  `type` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_inno_projects`
--

DROP TABLE IF EXISTS `TIP_inno_projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_inno_projects` (
  `innovation_id` int DEFAULT NULL,
  `AgreementId` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_inno_reference_additional_articles`
--

DROP TABLE IF EXISTS `TIP_inno_reference_additional_articles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_inno_reference_additional_articles` (
  `innovation_id` int DEFAULT NULL,
  `description` text,
  `link` text,
  `disclose` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_inno_reference_additional_urls`
--

DROP TABLE IF EXISTS `TIP_inno_reference_additional_urls`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_inno_reference_additional_urls` (
  `innovation_id` int DEFAULT NULL,
  `description` text,
  `link` text,
  `disclose` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_inno_reference_information`
--

DROP TABLE IF EXISTS `TIP_inno_reference_information`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_inno_reference_information` (
  `innovation_id` int DEFAULT NULL,
  `description` text,
  `link` text,
  `disclose` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_inno_references`
--

DROP TABLE IF EXISTS `TIP_inno_references`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_inno_references` (
  `innovation_id` int DEFAULT NULL,
  `description` text,
  `link` text,
  `disclose` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_inno_regions`
--

DROP TABLE IF EXISTS `TIP_inno_regions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_inno_regions` (
  `innovation_id` int DEFAULT NULL,
  `RegionName` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_inno_sdg`
--

DROP TABLE IF EXISTS `TIP_inno_sdg`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_inno_sdg` (
  `innovation_id` int DEFAULT NULL,
  `name` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_inno_shared_users`
--

DROP TABLE IF EXISTS `TIP_inno_shared_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_inno_shared_users` (
  `innovation_id` int DEFAULT NULL,
  `writer` int DEFAULT NULL,
  `name` text,
  `email` text,
  `idCard` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_inno_sponsor`
--

DROP TABLE IF EXISTS `TIP_inno_sponsor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_inno_sponsor` (
  `innovation_id` int DEFAULT NULL,
  `institution_name` text,
  `url` text,
  `acronym` text,
  `website` text,
  `CountryUN` float DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_inno_tool_function`
--

DROP TABLE IF EXISTS `TIP_inno_tool_function`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_inno_tool_function` (
  `innovation_id` int DEFAULT NULL,
  `name` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TIP_innovation`
--

DROP TABLE IF EXISTS `TIP_innovation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TIP_innovation` (
  `innovation_id` int DEFAULT NULL,
  `long_title` text,
  `short_title` text,
  `description` text,
  `nature` text,
  `type` text,
  `readiness` int DEFAULT NULL,
  `readiness_explanation` text,
  `state` text,
  `updated_at` varchar(255) DEFAULT NULL,
  `created_at` varchar(255) DEFAULT NULL,
  `ip1` text,
  `ip2` text,
  `ip_license` text,
  `reason_deny` text,
  `scope` text,
  `shared` int DEFAULT NULL,
  `is_tool` int DEFAULT NULL,
  `results` text,
  `tool_context` text,
  `originalcontext` int DEFAULT NULL,
  `adaptedcontext` text,
  `has_url_reference` int DEFAULT NULL,
  `tools_used_with` text,
  `intellectual_property_id` float DEFAULT NULL,
  `submitterName` text,
  `submitterEmail` text,
  `submitterID` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `actor_roles`
--

DROP TABLE IF EXISTS `actor_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `actor_roles` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `actor_role_id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  PRIMARY KEY (`actor_role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `agresso_contract_countries`
--

DROP TABLE IF EXISTS `agresso_contract_countries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `agresso_contract_countries` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `agreement_id` varchar(36) NOT NULL,
  `iso_alpha_2` varchar(3) NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`agreement_id`,`iso_alpha_2`),
  CONSTRAINT `FK_13feff5cf0e0a5284efdbe4986c` FOREIGN KEY (`agreement_id`) REFERENCES `agresso_contracts` (`agreement_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `agresso_contracts`
--

DROP TABLE IF EXISTS `agresso_contracts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `agresso_contracts` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `agreement_id` varchar(36) NOT NULL,
  `center_amount` decimal(20,3) NOT NULL DEFAULT '0.000',
  `center_amount_usd` decimal(20,3) NOT NULL DEFAULT '0.000',
  `grant_amount` decimal(20,3) NOT NULL DEFAULT '0.000',
  `grant_amount_usd` decimal(20,3) NOT NULL DEFAULT '0.000',
  `office` text,
  `officeId` text,
  `client` text,
  `contract_status` text,
  `department` text,
  `departmentId` text,
  `description` text,
  `division` text,
  `divisionId` text,
  `donor` text,
  `donor_reference` text,
  `entity` text,
  `funding_type` text,
  `project` text,
  `projectDescription` text,
  `project_lead_description` text,
  `short_title` text,
  `ubwClientDescription` text,
  `unit` text,
  `unitId` text,
  `endDateGlobal` datetime DEFAULT NULL,
  `endDatefinance` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `extension_date` datetime DEFAULT NULL,
  `start_date` datetime DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `sdgs` json DEFAULT NULL,
  `programAssistantId` varchar(15) DEFAULT NULL,
  `programAssistantName` text,
  `projectLeadId` varchar(15) DEFAULT NULL,
  `researchAssistantName` text,
  `researchAssistantId` varchar(15) DEFAULT NULL,
  `is_pool_funding_contributor` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`agreement_id`),
  KEY `idx_agresso_contract_pool_funding` (`is_pool_funding_contributor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `alliance_user_staff`
--

DROP TABLE IF EXISTS `alliance_user_staff`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alliance_user_staff` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `carnet` varchar(10) NOT NULL,
  `first_name` text NOT NULL,
  `last_name` text NOT NULL,
  `email` text,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `status` text,
  `center` text,
  `position` text,
  PRIMARY KEY (`carnet`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `alliance_user_staff_groups`
--

DROP TABLE IF EXISTS `alliance_user_staff_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alliance_user_staff_groups` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `carnet` varchar(10) NOT NULL,
  `staff_group_id` bigint NOT NULL,
  PRIMARY KEY (`carnet`,`staff_group_id`),
  UNIQUE KEY `idx_ausg_carnet` (`carnet`,`staff_group_id`),
  KEY `FK_fdb43d1536f520c1005dc90427d` (`staff_group_id`),
  CONSTRAINT `FK_62152ab2557527df23460c0fa78` FOREIGN KEY (`carnet`) REFERENCES `alliance_user_staff` (`carnet`),
  CONSTRAINT `FK_fdb43d1536f520c1005dc90427d` FOREIGN KEY (`staff_group_id`) REFERENCES `staff_groups` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `announcement_settings`
--

DROP TABLE IF EXISTS `announcement_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `announcement_settings` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `announcement_id` bigint NOT NULL AUTO_INCREMENT,
  `title` text,
  `description` text,
  `src` text,
  `link` text,
  `start_date` timestamp NULL DEFAULT NULL,
  `end_date` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`announcement_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `app_config`
--

DROP TABLE IF EXISTS `app_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `app_config` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `key` varchar(255) NOT NULL,
  `description` text,
  `simple_value` text,
  `json_value` json DEFAULT NULL,
  `category` text,
  `subcategory` text,
  `field` text,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `app_secret_host_list`
--

DROP TABLE IF EXISTS `app_secret_host_list`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `app_secret_host_list` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `app_secret_host_list_id` bigint NOT NULL AUTO_INCREMENT,
  `app_secret_id` bigint NOT NULL,
  `host` text NOT NULL,
  PRIMARY KEY (`app_secret_host_list_id`),
  KEY `FK_5bee4f9f93fbd7138320256a997` (`app_secret_id`),
  CONSTRAINT `FK_5bee4f9f93fbd7138320256a997` FOREIGN KEY (`app_secret_id`) REFERENCES `app_secrets` (`app_secret_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `app_secrets`
--

DROP TABLE IF EXISTS `app_secrets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `app_secrets` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `app_secret_id` bigint NOT NULL AUTO_INCREMENT,
  `app_secret_key` text NOT NULL,
  `app_secret_uuid` text NOT NULL,
  `app_secret_description` text,
  `responsible_user_id` bigint NOT NULL,
  PRIMARY KEY (`app_secret_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bilateral_project_mapping`
--

DROP TABLE IF EXISTS `bilateral_project_mapping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bilateral_project_mapping` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `agresso_agreement_id` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL COMMENT 'FK-by-value to agresso_contract.agreement_id',
  `clarisa_project_id` int NOT NULL COMMENT 'Upstream CLARISA project.id',
  `clarisa_project_short_name` varchar(500) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL COMMENT 'Snapshot at mapping time (D-PI-11)',
  `source` enum('MANUAL','AI_SUGGESTED','AI_AUTO') COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT 'MANUAL',
  `confidence_score` float DEFAULT NULL COMMENT 'Populated only when source != MANUAL',
  `notes` text COLLATE utf8mb4_unicode_520_ci,
  `active_agreement_id` varchar(50) COLLATE utf8mb4_unicode_520_ci GENERATED ALWAYS AS (if((`is_active` = 1),`agresso_agreement_id`,NULL)) STORED COMMENT 'D-PI-9: emulates partial-unique on agresso_agreement_id WHERE is_active = 1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bpm_active_agreement` (`active_agreement_id`),
  KEY `idx_bpm_agreement` (`agresso_agreement_id`),
  KEY `idx_bpm_clarisa_project` (`clarisa_project_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bulk_upload_processes`
--

DROP TABLE IF EXISTS `bulk_upload_processes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bulk_upload_processes` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `file_name` text NOT NULL,
  `ai_interaction_id` text NOT NULL,
  `total_results` bigint DEFAULT NULL,
  `total_capdev_results` bigint DEFAULT NULL,
  `total_participants` bigint DEFAULT NULL,
  `total_female_participants` bigint DEFAULT NULL,
  `activity_start_date` timestamp NULL DEFAULT NULL,
  `activity_end_date` timestamp NULL DEFAULT NULL,
  `countries` json DEFAULT NULL,
  `notification_sent_at` timestamp NULL DEFAULT NULL,
  `notification_status` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bulk_upload_results`
--

DROP TABLE IF EXISTS `bulk_upload_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bulk_upload_results` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `bulk_upload_process_id` bigint NOT NULL,
  `result_id` bigint DEFAULT NULL,
  `missing_fields` json DEFAULT NULL,
  `manual_intervention_occurred` tinyint DEFAULT NULL,
  `suggested_status` bigint DEFAULT NULL,
  `final_status` bigint DEFAULT NULL,
  `error_message` text,
  `title` text,
  `indicator_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_8323e3f5f3b0414140c1b5d2f15` (`result_id`),
  KEY `FK_f467aec54d504951b0811cdd7c2` (`bulk_upload_process_id`),
  KEY `FK_437404b1e2639c84a47e6117f71` (`indicator_id`),
  KEY `FK_f05df7141c61cb5b1d2a14a0406` (`final_status`),
  KEY `FK_8e17444ba0acb49f52a127443ab` (`suggested_status`),
  CONSTRAINT `FK_437404b1e2639c84a47e6117f71` FOREIGN KEY (`indicator_id`) REFERENCES `indicators` (`indicator_id`),
  CONSTRAINT `FK_8323e3f5f3b0414140c1b5d2f15` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`),
  CONSTRAINT `FK_8e17444ba0acb49f52a127443ab` FOREIGN KEY (`suggested_status`) REFERENCES `result_status` (`result_status_id`),
  CONSTRAINT `FK_f05df7141c61cb5b1d2a14a0406` FOREIGN KEY (`final_status`) REFERENCES `result_status` (`result_status_id`),
  CONSTRAINT `FK_f467aec54d504951b0811cdd7c2` FOREIGN KEY (`bulk_upload_process_id`) REFERENCES `bulk_upload_processes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=76 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clarisa_actor_types`
--

DROP TABLE IF EXISTS `clarisa_actor_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clarisa_actor_types` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `code` bigint NOT NULL,
  `name` text NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clarisa_countries`
--

DROP TABLE IF EXISTS `clarisa_countries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clarisa_countries` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `isoAlpha2` varchar(3) NOT NULL,
  `isoAlpha3` varchar(4) DEFAULT NULL,
  `name` text,
  `longitude` decimal(8,4) DEFAULT NULL,
  `latitude` decimal(8,4) DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `code` bigint DEFAULT NULL,
  PRIMARY KEY (`isoAlpha2`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clarisa_geo_scope`
--

DROP TABLE IF EXISTS `clarisa_geo_scope`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clarisa_geo_scope` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `code` bigint NOT NULL,
  `name` text,
  `definition` text,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clarisa_global_targets`
--

DROP TABLE IF EXISTS `clarisa_global_targets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clarisa_global_targets` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `targetId` bigint NOT NULL,
  `smo_code` varchar(10) NOT NULL,
  `target` text NOT NULL,
  `impactAreaId` bigint NOT NULL,
  `impactAreaName` varchar(255) NOT NULL,
  PRIMARY KEY (`targetId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clarisa_impact_areas`
--

DROP TABLE IF EXISTS `clarisa_impact_areas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clarisa_impact_areas` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL,
  `name` text,
  `description` text,
  `financial_code` text,
  `icon` text,
  `color` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clarisa_initiatives`
--

DROP TABLE IF EXISTS `clarisa_initiatives`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clarisa_initiatives` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL,
  `name` text,
  `short_name` text,
  `official_code` text,
  `type_id` bigint DEFAULT NULL,
  `active` tinyint NOT NULL DEFAULT '1',
  `status` text,
  `stageId` bigint DEFAULT NULL,
  `description` text,
  `action_area_id` bigint DEFAULT NULL,
  `action_area_description` text,
  `stages` json DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clarisa_innovation_characteristics`
--

DROP TABLE IF EXISTS `clarisa_innovation_characteristics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clarisa_innovation_characteristics` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL,
  `name` text,
  `definition` text,
  `source_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clarisa_innovation_readiness_levels`
--

DROP TABLE IF EXISTS `clarisa_innovation_readiness_levels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clarisa_innovation_readiness_levels` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL,
  `level` bigint DEFAULT NULL,
  `name` text,
  `definition` text,
  `additional_guidance` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clarisa_innovation_types`
--

DROP TABLE IF EXISTS `clarisa_innovation_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clarisa_innovation_types` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `code` bigint NOT NULL,
  `name` text,
  `definition` text,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clarisa_institution_locations`
--

DROP TABLE IF EXISTS `clarisa_institution_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clarisa_institution_locations` (
  `code` bigint NOT NULL,
  `name` text,
  `institution_id` bigint NOT NULL,
  `isoAlpha2` varchar(3) NOT NULL,
  `isHeadquarter` tinyint DEFAULT NULL,
  PRIMARY KEY (`code`),
  KEY `FK_d7c26dfa9cf787a34975ea68d32` (`institution_id`),
  KEY `FK_8332e9b7269d91b8db571094096` (`isoAlpha2`),
  CONSTRAINT `FK_8332e9b7269d91b8db571094096` FOREIGN KEY (`isoAlpha2`) REFERENCES `clarisa_countries` (`isoAlpha2`),
  CONSTRAINT `FK_d7c26dfa9cf787a34975ea68d32` FOREIGN KEY (`institution_id`) REFERENCES `clarisa_institutions` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clarisa_institution_types`
--

DROP TABLE IF EXISTS `clarisa_institution_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clarisa_institution_types` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `code` bigint NOT NULL,
  `name` text,
  `description` text,
  `parent_code` bigint DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`code`),
  KEY `FK_5bb4b590a7a2fa58ebd39e6289d` (`parent_code`),
  CONSTRAINT `FK_5bb4b590a7a2fa58ebd39e6289d` FOREIGN KEY (`parent_code`) REFERENCES `clarisa_institution_types` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clarisa_institutions`
--

DROP TABLE IF EXISTS `clarisa_institutions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clarisa_institutions` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `code` bigint NOT NULL,
  `name` text,
  `acronym` text,
  `websiteLink` text,
  `added` timestamp NULL DEFAULT NULL,
  `institution_type_id` bigint DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`code`),
  KEY `FK_c487f2dfe9069367da65076d0c4` (`institution_type_id`),
  CONSTRAINT `FK_c487f2dfe9069367da65076d0c4` FOREIGN KEY (`institution_type_id`) REFERENCES `clarisa_institution_types` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clarisa_languages`
--

DROP TABLE IF EXISTS `clarisa_languages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clarisa_languages` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `id` bigint NOT NULL,
  `name` text,
  `iso_alpha_2` text,
  `iso_alpha_3` text,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clarisa_levers`
--

DROP TABLE IF EXISTS `clarisa_levers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clarisa_levers` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `id` bigint NOT NULL AUTO_INCREMENT,
  `short_name` text,
  `full_name` text,
  `other_names` text,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `portfolio_id` bigint DEFAULT NULL,
  `icon` text,
  PRIMARY KEY (`id`),
  KEY `FK_4dc6cb03332e668acae91bf80a3` (`portfolio_id`),
  CONSTRAINT `FK_4dc6cb03332e668acae91bf80a3` FOREIGN KEY (`portfolio_id`) REFERENCES `portfolios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clarisa_regions`
--

DROP TABLE IF EXISTS `clarisa_regions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clarisa_regions` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `um49Code` bigint NOT NULL,
  `name` text,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`um49Code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clarisa_science_programs`
--

DROP TABLE IF EXISTS `clarisa_science_programs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clarisa_science_programs` (
  `official_code` varchar(20) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `category` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL COMMENT 'Science programs | Scaling programs | Accelerators',
  `color` varchar(20) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL COMMENT 'Hex color for UI badge / icon background',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `icon_key` varchar(64) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL COMMENT 'Stable FE asset key — defaults to official_code',
  PRIMARY KEY (`official_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clarisa_sdg_targets`
--

DROP TABLE IF EXISTS `clarisa_sdg_targets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clarisa_sdg_targets` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL,
  `sdg_target` text,
  `sdg_target_code` text,
  `clarisa_sdg_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_88f3f702de4bb4cc1e5df38181e` (`clarisa_sdg_id`),
  CONSTRAINT `FK_88f3f702de4bb4cc1e5df38181e` FOREIGN KEY (`clarisa_sdg_id`) REFERENCES `clarisa_sdgs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clarisa_sdgs`
--

DROP TABLE IF EXISTS `clarisa_sdgs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clarisa_sdgs` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL,
  `smo_code` bigint DEFAULT NULL,
  `financial_code` text,
  `short_name` text,
  `full_name` text,
  `icon` text,
  `color` text,
  `description` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clarisa_sub_nationals`
--

DROP TABLE IF EXISTS `clarisa_sub_nationals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clarisa_sub_nationals` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `id` bigint NOT NULL,
  `code` text,
  `name` text,
  `country_iso_alpha_2` varchar(3) DEFAULT NULL,
  `language_iso_2` varchar(3) DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `other_names` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_182bec9487d08d6779c7004443e` (`country_iso_alpha_2`),
  CONSTRAINT `FK_182bec9487d08d6779c7004443e` FOREIGN KEY (`country_iso_alpha_2`) REFERENCES `clarisa_countries` (`isoAlpha2`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `contract_roles`
--

DROP TABLE IF EXISTS `contract_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contract_roles` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `contract_role_id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`contract_role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `country_roles`
--

DROP TABLE IF EXISTS `country_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `country_roles` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `country_role_id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`country_role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `degrees`
--

DROP TABLE IF EXISTS `degrees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `degrees` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `degree_id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`degree_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `delivery_modalities`
--

DROP TABLE IF EXISTS `delivery_modalities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `delivery_modalities` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `delivery_modality_id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`delivery_modality_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dissemination_qualifications`
--

DROP TABLE IF EXISTS `dissemination_qualifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dissemination_qualifications` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `evidence_roles`
--

DROP TABLE IF EXISTS `evidence_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `evidence_roles` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `evidence_role_id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`evidence_role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `expansion_potentials`
--

DROP TABLE IF EXISTS `expansion_potentials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expansion_potentials` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `gender`
--

DROP TABLE IF EXISTS `gender`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gender` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `gender_id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`gender_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `groups_items`
--

DROP TABLE IF EXISTS `groups_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `groups_items` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `description` text,
  `official_code` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `agreement_id` varchar(100) NOT NULL,
  `parent_id` int DEFAULT NULL,
  `group_name` varchar(255) DEFAULT NULL,
  `custom_field_1` text,
  `custom_field_2` text,
  `custom_field_3` text,
  `custom_field_4` text,
  `custom_field_5` text,
  `custom_field_6` text,
  `custom_field_7` text,
  `custom_field_8` text,
  `custom_field_9` text,
  `custom_field_10` text,
  PRIMARY KEY (`id`),
  KEY `FK_cc811cd141dd58f44fe2fc4e8a4` (`parent_id`),
  CONSTRAINT `FK_cc811cd141dd58f44fe2fc4e8a4` FOREIGN KEY (`parent_id`) REFERENCES `groups_items` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=1998 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `impact_area_scores`
--

DROP TABLE IF EXISTS `impact_area_scores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `impact_area_scores` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `impact_outcomes`
--

DROP TABLE IF EXISTS `impact_outcomes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `impact_outcomes` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `description` text,
  `portfolio_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_9bdaccc8dfdd1c2c716f9f5c06e` (`portfolio_id`),
  CONSTRAINT `FK_9bdaccc8dfdd1c2c716f9f5c06e` FOREIGN KEY (`portfolio_id`) REFERENCES `portfolios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `indicator_per_item`
--

DROP TABLE IF EXISTS `indicator_per_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `indicator_per_item` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_item_id` int DEFAULT NULL,
  `project_indicator_id` int DEFAULT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_group_project` (`group_item_id`,`project_indicator_id`),
  KEY `FK_8020bbf7eb6a1fa4bf7529407c6` (`project_indicator_id`),
  CONSTRAINT `FK_4ab55bc2af7907b55fe3a85490e` FOREIGN KEY (`group_item_id`) REFERENCES `groups_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_8020bbf7eb6a1fa4bf7529407c6` FOREIGN KEY (`project_indicator_id`) REFERENCES `project_indicators` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=590772 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `indicator_types`
--

DROP TABLE IF EXISTS `indicator_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `indicator_types` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `indicator_type_id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `long_description` text,
  `description` text,
  `other_names` text,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`indicator_type_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `indicators`
--

DROP TABLE IF EXISTS `indicators`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `indicators` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `indicator_id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `indicator_type_id` bigint NOT NULL,
  `description` text,
  `long_description` text,
  `icon_src` text,
  `other_names` text,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `position` bigint DEFAULT NULL,
  PRIMARY KEY (`indicator_id`),
  KEY `FK_ea5d3ef0297d7f3802c260e232d` (`indicator_type_id`),
  CONSTRAINT `FK_ea5d3ef0297d7f3802c260e232d` FOREIGN KEY (`indicator_type_id`) REFERENCES `indicator_types` (`indicator_type_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `informative_roles`
--

DROP TABLE IF EXISTS `informative_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `informative_roles` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `innovation_dev_anticipated_users`
--

DROP TABLE IF EXISTS `innovation_dev_anticipated_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `innovation_dev_anticipated_users` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `institution_roles`
--

DROP TABLE IF EXISTS `institution_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `institution_roles` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `institution_role_id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`institution_role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `institution_type_roles`
--

DROP TABLE IF EXISTS `institution_type_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `institution_type_roles` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `institution_type_role_id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  PRIMARY KEY (`institution_type_role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `intellectual_property_owner`
--

DROP TABLE IF EXISTS `intellectual_property_owner`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `intellectual_property_owner` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `intellectual_property_owner_id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  PRIMARY KEY (`intellectual_property_owner_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ip_rights_application_options`
--

DROP TABLE IF EXISTS `ip_rights_application_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ip_rights_application_options` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `issue_categories`
--

DROP TABLE IF EXISTS `issue_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `issue_categories` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `issue_category_id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `description` text NOT NULL,
  PRIMARY KEY (`issue_category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `language_roles`
--

DROP TABLE IF EXISTS `language_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `language_roles` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `language_role_id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`language_role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lever_roles`
--

DROP TABLE IF EXISTS `lever_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lever_roles` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `lever_role_id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`lever_role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lever_sdg_targets`
--

DROP TABLE IF EXISTS `lever_sdg_targets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lever_sdg_targets` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `lever_id` bigint NOT NULL,
  `sdg_target_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `lever_id_sdg_target_id_index` (`lever_id`,`sdg_target_id`),
  KEY `FK_ec9ff129b18f91807d275685826` (`sdg_target_id`),
  CONSTRAINT `FK_e06b57688faa64aa79b1afd2e97` FOREIGN KEY (`lever_id`) REFERENCES `clarisa_levers` (`id`),
  CONSTRAINT `FK_ec9ff129b18f91807d275685826` FOREIGN KEY (`sdg_target_id`) REFERENCES `clarisa_sdg_targets` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=81 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lever_strategic_outcome`
--

DROP TABLE IF EXISTS `lever_strategic_outcome`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lever_strategic_outcome` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `lever_id` bigint DEFAULT NULL,
  `strategic_outcome` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `link_result_roles`
--

DROP TABLE IF EXISTS `link_result_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `link_result_roles` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `link_result_role_id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`link_result_role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `link_results`
--

DROP TABLE IF EXISTS `link_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `link_results` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `link_result_id` bigint NOT NULL AUTO_INCREMENT,
  `result_id` bigint NOT NULL,
  `other_result_id` bigint NOT NULL,
  `link_result_role_id` bigint NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`link_result_id`),
  KEY `FK_037db4669bd7696668263da6b15` (`result_id`),
  KEY `FK_a3ebe38391666df2c14028490e2` (`other_result_id`),
  KEY `FK_290df3566c4fde66ce6ceecc10d` (`link_result_role_id`),
  CONSTRAINT `FK_037db4669bd7696668263da6b15` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`),
  CONSTRAINT `FK_290df3566c4fde66ce6ceecc10d` FOREIGN KEY (`link_result_role_id`) REFERENCES `link_result_roles` (`link_result_role_id`),
  CONSTRAINT `FK_a3ebe38391666df2c14028490e2` FOREIGN KEY (`other_result_id`) REFERENCES `results` (`result_id`)
) ENGINE=InnoDB AUTO_INCREMENT=153 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `maturity_levels`
--

DROP TABLE IF EXISTS `maturity_levels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `maturity_levels` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `description` text NOT NULL,
  `full_name` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `timestamp` bigint NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=369 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notable_reference_types`
--

DROP TABLE IF EXISTS `notable_reference_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notable_reference_types` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `policy_stage`
--

DROP TABLE IF EXISTS `policy_stage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `policy_stage` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `policy_stage_id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `description` text,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`policy_stage_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `policy_types`
--

DROP TABLE IF EXISTS `policy_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `policy_types` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `policy_type_id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`policy_type_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pooled_funding_contracts`
--

DROP TABLE IF EXISTS `pooled_funding_contracts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pooled_funding_contracts` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `agreement_id` varchar(36) NOT NULL,
  `cgiar_entity_code` text,
  `cgiar_entity_name` text,
  PRIMARY KEY (`id`),
  KEY `FK_7b48a2e3bf656efd12ac188a845` (`agreement_id`),
  CONSTRAINT `FK_7b48a2e3bf656efd12ac188a845` FOREIGN KEY (`agreement_id`) REFERENCES `agresso_contracts` (`agreement_id`)
) ENGINE=InnoDB AUTO_INCREMENT=88 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `portfolios`
--

DROP TABLE IF EXISTS `portfolios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `portfolios` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `start_year` int NOT NULL,
  `end_year` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `project_groups`
--

DROP TABLE IF EXISTS `project_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_groups` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `level` int NOT NULL,
  `custom_field_1` text,
  `custom_field_2` text,
  `custom_field_3` text,
  `custom_field_4` text,
  `custom_field_5` text,
  `custom_field_6` text,
  `custom_field_7` text,
  `custom_field_8` text,
  `custom_field_9` text,
  `custom_field_10` text,
  `agreement_id` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `project_indicators`
--

DROP TABLE IF EXISTS `project_indicators`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_indicators` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `code` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci,
  `number_type` enum('sum','average','count','yes/no') NOT NULL,
  `number_format` enum('number (Integer)','decimal') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `target_unit` varchar(50) DEFAULT NULL,
  `target_value` decimal(15,4) DEFAULT NULL,
  `base_line` decimal(15,4) DEFAULT NULL,
  `agreement_id` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `year` json DEFAULT NULL,
  `type` enum('output','outcome','impact','other') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=87 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `project_indicators_results`
--

DROP TABLE IF EXISTS `project_indicators_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_indicators_results` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `result_id` bigint DEFAULT NULL,
  `indicator_id` int DEFAULT NULL,
  `contribution_value` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_36dfa37c81df793f575b6002fce` (`result_id`),
  KEY `FK_39ae9dc77684d4c2b9157fb411f` (`indicator_id`),
  CONSTRAINT `FK_36dfa37c81df793f575b6002fce` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`) ON DELETE CASCADE,
  CONSTRAINT `FK_39ae9dc77684d4c2b9157fb411f` FOREIGN KEY (`indicator_id`) REFERENCES `project_indicators` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=54 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `quantification_roles`
--

DROP TABLE IF EXISTS `quantification_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quantification_roles` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `report_alliance_alignment`
--

DROP TABLE IF EXISTS `report_alliance_alignment`;
/*!50001 DROP VIEW IF EXISTS `report_alliance_alignment`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `report_alliance_alignment` AS SELECT 
 1 AS `result_id`,
 1 AS `primary_project`,
 1 AS `primary_project_principal_investigator`,
 1 AS `primary_project_start_date`,
 1 AS `primary_project_end_date`,
 1 AS `contributing_projects`,
 1 AS `primary_lever`,
 1 AS `contributor_lever`,
 1 AS `sdg_targets`,
 1 AS `strategic_outcomes`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `report_capacity_sharing_development`
--

DROP TABLE IF EXISTS `report_capacity_sharing_development`;
/*!50001 DROP VIEW IF EXISTS `report_capacity_sharing_development`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `report_capacity_sharing_development` AS SELECT 
 1 AS `result_id`,
 1 AS `training_engagement_report`,
 1 AS `is_this_training_engagement`,
 1 AS `length_training`,
 1 AS `degree`,
 1 AS `traning_supervisor`,
 1 AS `language`,
 1 AS `start_date`,
 1 AS `end_date`,
 1 AS `delivery_modality`,
 1 AS `individual_trainee_affiliation`,
 1 AS `individual_trainee_name`,
 1 AS `individual_trainee_nationality`,
 1 AS `individual_gender`,
 1 AS `group_session_participants_total`,
 1 AS `group_session_participants_female`,
 1 AS `group_session_participants_male`,
 1 AS `group_session_participants_non_binary`,
 1 AS `group_session_purpose_name`,
 1 AS `group_session_purpose_description`,
 1 AS `group_is_attending_organization`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `report_data_dictionary`
--

DROP TABLE IF EXISTS `report_data_dictionary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `report_data_dictionary` (
  `report_data_dictionary_id` bigint NOT NULL AUTO_INCREMENT,
  `workbook_key` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `section` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `field_label` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `explanation` text COLLATE utf8mb4_unicode_ci,
  `section_fill_argb` varchar(9) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int NOT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`report_data_dictionary_id`),
  KEY `idx_workbook_dict_sort` (`workbook_key`,`sort_order`)
) ENGINE=InnoDB AUTO_INCREMENT=110 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `report_evidences`
--

DROP TABLE IF EXISTS `report_evidences`;
/*!50001 DROP VIEW IF EXISTS `report_evidences`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `report_evidences` AS SELECT 
 1 AS `result_id`,
 1 AS `evidences`,
 1 AS `notable_references`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `report_general_information`
--

DROP TABLE IF EXISTS `report_general_information`;
/*!50001 DROP VIEW IF EXISTS `report_general_information`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `report_general_information` AS SELECT 
 1 AS `result_id`,
 1 AS `result_code`,
 1 AS `platform_code`,
 1 AS `public_link`,
 1 AS `platform_link`,
 1 AS `indicator`,
 1 AS `status`,
 1 AS `result_title`,
 1 AS `result_description`,
 1 AS `reporting_year`,
 1 AS `approved_versions`,
 1 AS `keywords`,
 1 AS `creator`,
 1 AS `creation_date`,
 1 AS `main_contact_person`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `report_geo_location`
--

DROP TABLE IF EXISTS `report_geo_location`;
/*!50001 DROP VIEW IF EXISTS `report_geo_location`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `report_geo_location` AS SELECT 
 1 AS `result_id`,
 1 AS `geo_scope_name`,
 1 AS `countries`,
 1 AS `regions`,
 1 AS `sub_nationals`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `report_innovation_dev`
--

DROP TABLE IF EXISTS `report_innovation_dev`;
/*!50001 DROP VIEW IF EXISTS `report_innovation_dev`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `report_innovation_dev` AS SELECT 
 1 AS `result_id`,
 1 AS `short_title`,
 1 AS `innovation_nature`,
 1 AS `innovation_type`,
 1 AS `innovation_readiness_level`,
 1 AS `innovation_readiness_explanation`,
 1 AS `no_sex_age_disaggregation`,
 1 AS `anticipated_users`,
 1 AS `expected_outcome`,
 1 AS `intended_beneficiaries_description`,
 1 AS `is_new_or_improved_variety`,
 1 AS `new_or_improved_varieties_count`,
 1 AS `actors`,
 1 AS `innovation_partners`,
 1 AS `is_knowledge_sharing`,
 1 AS `dissemination_qualification`,
 1 AS `tool_useful_context`,
 1 AS `results_achieved_expected`,
 1 AS `tool_functions`,
 1 AS `is_used_beyond_original_context`,
 1 AS `adoption_adaptation_context`,
 1 AS `other_tools`,
 1 AS `other_tools_integration`,
 1 AS `link_to_results`,
 1 AS `is_cheaper_than_alternatives`,
 1 AS `is_simpler_to_use`,
 1 AS `does_perform_better`,
 1 AS `is_desirable_to_users`,
 1 AS `has_commercial_viability`,
 1 AS `has_suitable_enabling_environment`,
 1 AS `has_evidence_of_uptake`,
 1 AS `expansion_potential`,
 1 AS `expansion_adaptation_details`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `report_ip_rights`
--

DROP TABLE IF EXISTS `report_ip_rights`;
/*!50001 DROP VIEW IF EXISTS `report_ip_rights`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `report_ip_rights` AS SELECT 
 1 AS `result_id`,
 1 AS `who_owns_ip_rights`,
 1 AS `third_party`,
 1 AS `legal_restrictions_publication`,
 1 AS `commercialization_potential_asset`,
 1 AS `asset_need_refinement`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `report_link_result`
--

DROP TABLE IF EXISTS `report_link_result`;
/*!50001 DROP VIEW IF EXISTS `report_link_result`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `report_link_result` AS SELECT 
 1 AS `result_id`,
 1 AS `link_results`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `report_oicr`
--

DROP TABLE IF EXISTS `report_oicr`;
/*!50001 DROP VIEW IF EXISTS `report_oicr`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `report_oicr` AS SELECT 
 1 AS `result_id`,
 1 AS `general_comment`,
 1 AS `maturity_level`,
 1 AS `oicr_internal_code`,
 1 AS `outcome_impact_statement`,
 1 AS `short_outcome_impact_statement`,
 1 AS `sharepoint_link`,
 1 AS `mel_regional_expert`,
 1 AS `tagging`,
 1 AS `quantifications`,
 1 AS `extrapolated_estimates`,
 1 AS `authors_contact_persons`,
 1 AS `for_external_use`,
 1 AS `for_external_use_description`,
 1 AS `impact_area`,
 1 AS `existing_oicr`,
 1 AS `cgspace_link`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `report_partners`
--

DROP TABLE IF EXISTS `report_partners`;
/*!50001 DROP VIEW IF EXISTS `report_partners`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `report_partners` AS SELECT 
 1 AS `result_id`,
 1 AS `partners`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `report_policy_change`
--

DROP TABLE IF EXISTS `report_policy_change`;
/*!50001 DROP VIEW IF EXISTS `report_policy_change`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `report_policy_change` AS SELECT 
 1 AS `result_id`,
 1 AS `evidence_stage`,
 1 AS `policy_type`,
 1 AS `policy_stage`,
 1 AS `implementing_organizations`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `report_workbook_column_group`
--

DROP TABLE IF EXISTS `report_workbook_column_group`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `report_workbook_column_group` (
  `report_workbook_column_group_id` bigint NOT NULL AUTO_INCREMENT,
  `workbook_key` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sheet_key` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int NOT NULL,
  `from_col` int NOT NULL,
  `to_col` int NOT NULL,
  `label` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fill_argb` varchar(9) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`report_workbook_column_group_id`),
  KEY `idx_workbook_sheet_sort` (`workbook_key`,`sheet_key`,`sort_order`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `report_workbook_sheet`
--

DROP TABLE IF EXISTS `report_workbook_sheet`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `report_workbook_sheet` (
  `report_workbook_sheet_id` bigint NOT NULL AUTO_INCREMENT,
  `workbook_key` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sheet_key` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sheet_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`report_workbook_sheet_id`),
  UNIQUE KEY `uq_workbook_sheet` (`workbook_key`,`sheet_key`),
  KEY `idx_workbook_sort` (`workbook_key`,`sort_order`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `report_years`
--

DROP TABLE IF EXISTS `report_years`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `report_years` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `report_year` year NOT NULL,
  PRIMARY KEY (`report_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `reporting_platforms`
--

DROP TABLE IF EXISTS `reporting_platforms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reporting_platforms` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `platform_code` varchar(50) NOT NULL,
  `platform_name` text,
  `platform_url` text,
  `responsible_name` text,
  `responsible_email` text,
  PRIMARY KEY (`platform_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_actors`
--

DROP TABLE IF EXISTS `result_actors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_actors` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `result_actors_id` bigint NOT NULL AUTO_INCREMENT,
  `result_id` bigint NOT NULL,
  `actor_type_id` bigint NOT NULL,
  `sex_age_disaggregation_not_apply` tinyint DEFAULT NULL,
  `women_youth` tinyint DEFAULT NULL,
  `women_not_youth` tinyint DEFAULT NULL,
  `men_youth` tinyint DEFAULT NULL,
  `men_not_youth` tinyint DEFAULT NULL,
  `actor_role_id` bigint NOT NULL,
  `actor_type_custom_name` text,
  PRIMARY KEY (`result_actors_id`),
  KEY `FK_ddf5180b215755556b02fc3dc21` (`result_id`),
  KEY `FK_ac038801c4c7a2d25d9b95f6bd8` (`actor_type_id`),
  KEY `FK_561ddcd56c23b7d0df6ad280fef` (`actor_role_id`),
  CONSTRAINT `FK_561ddcd56c23b7d0df6ad280fef` FOREIGN KEY (`actor_role_id`) REFERENCES `actor_roles` (`actor_role_id`),
  CONSTRAINT `FK_ac038801c4c7a2d25d9b95f6bd8` FOREIGN KEY (`actor_type_id`) REFERENCES `clarisa_actor_types` (`code`),
  CONSTRAINT `FK_ddf5180b215755556b02fc3dc21` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2144 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_cap_sharing_ip`
--

DROP TABLE IF EXISTS `result_cap_sharing_ip`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_cap_sharing_ip` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `result_cap_sharing_ip_id` bigint NOT NULL,
  `publicity_restriction` tinyint DEFAULT NULL,
  `requires_futher_development` tinyint DEFAULT NULL,
  `asset_ip_owner_id` bigint DEFAULT NULL,
  `asset_ip_owner_description` text,
  `potential_asset` tinyint DEFAULT NULL,
  `publicity_restriction_description` text,
  `requires_futher_development_description` text,
  `potential_asset_description` text,
  PRIMARY KEY (`result_cap_sharing_ip_id`),
  KEY `FK_d6e8ad34be1ffeda9eefbc778e3` (`asset_ip_owner_id`),
  CONSTRAINT `FK_d6e8ad34be1ffeda9eefbc778e3` FOREIGN KEY (`asset_ip_owner_id`) REFERENCES `intellectual_property_owner` (`intellectual_property_owner_id`),
  CONSTRAINT `FK_edaef5d259ac93f16c555baec82` FOREIGN KEY (`result_cap_sharing_ip_id`) REFERENCES `results` (`result_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_capacity_sharing`
--

DROP TABLE IF EXISTS `result_capacity_sharing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_capacity_sharing` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `result_id` bigint NOT NULL,
  `training_title` text,
  `session_format_id` bigint DEFAULT NULL,
  `session_type_id` bigint DEFAULT NULL,
  `degree_id` bigint DEFAULT NULL,
  `gender_id` bigint DEFAULT NULL,
  `session_length_id` bigint DEFAULT NULL,
  `session_purpose_id` bigint DEFAULT NULL,
  `session_purpose_description` text,
  `session_participants_male` bigint DEFAULT NULL,
  `session_participants_female` bigint DEFAULT NULL,
  `session_participants_non_binary` bigint DEFAULT NULL,
  `session_description` text,
  `is_attending_organization` tinyint DEFAULT NULL,
  `delivery_modality_id` bigint DEFAULT NULL,
  `trainee_name` text,
  `session_participants_total` bigint DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `start_date` timestamp(6) NULL DEFAULT NULL,
  `end_date` timestamp(6) NULL DEFAULT NULL,
  PRIMARY KEY (`result_id`),
  KEY `FK_7a30a2908ad8624acdd7e4b1290` (`session_format_id`),
  KEY `FK_5bf7ce7434769329c2185fedc40` (`session_type_id`),
  KEY `FK_ba19954fabad107fc1d149c0ea0` (`degree_id`),
  KEY `FK_1ac9d698d5a1ad1a68c21d64a01` (`gender_id`),
  KEY `FK_2c6dfc989f6f2b32a09fd7412ee` (`session_length_id`),
  KEY `FK_e9cbb55da974c91a7e279ac0df2` (`session_purpose_id`),
  KEY `FK_533c5c7ca762de78889ea58f1c6` (`delivery_modality_id`),
  CONSTRAINT `FK_1ac9d698d5a1ad1a68c21d64a01` FOREIGN KEY (`gender_id`) REFERENCES `gender` (`gender_id`),
  CONSTRAINT `FK_2c6dfc989f6f2b32a09fd7412ee` FOREIGN KEY (`session_length_id`) REFERENCES `session_lengths` (`session_length_id`),
  CONSTRAINT `FK_533c5c7ca762de78889ea58f1c6` FOREIGN KEY (`delivery_modality_id`) REFERENCES `delivery_modalities` (`delivery_modality_id`),
  CONSTRAINT `FK_5bf7ce7434769329c2185fedc40` FOREIGN KEY (`session_type_id`) REFERENCES `session_types` (`session_type_id`),
  CONSTRAINT `FK_7a30a2908ad8624acdd7e4b1290` FOREIGN KEY (`session_format_id`) REFERENCES `session_formats` (`session_format_id`),
  CONSTRAINT `FK_9819eac11aa1d3ee4c8b6878aec` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`),
  CONSTRAINT `FK_ba19954fabad107fc1d149c0ea0` FOREIGN KEY (`degree_id`) REFERENCES `degrees` (`degree_id`),
  CONSTRAINT `FK_e9cbb55da974c91a7e279ac0df2` FOREIGN KEY (`session_purpose_id`) REFERENCES `session_purposes` (`session_purpose_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_contracts`
--

DROP TABLE IF EXISTS `result_contracts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_contracts` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `result_contract_id` bigint NOT NULL AUTO_INCREMENT,
  `result_id` bigint NOT NULL,
  `contract_role_id` bigint NOT NULL,
  `contract_id` varchar(36) NOT NULL,
  `is_primary` tinyint NOT NULL DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`result_contract_id`),
  KEY `FK_3784aaef37a4d341fbe6517fdee` (`contract_role_id`),
  KEY `FK_8bff1bb2850fece77f12247f303` (`result_id`),
  KEY `FK_4b8eb4ce310754d6fd971f47157` (`contract_id`),
  CONSTRAINT `FK_3784aaef37a4d341fbe6517fdee` FOREIGN KEY (`contract_role_id`) REFERENCES `contract_roles` (`contract_role_id`),
  CONSTRAINT `FK_4b8eb4ce310754d6fd971f47157` FOREIGN KEY (`contract_id`) REFERENCES `agresso_contracts` (`agreement_id`),
  CONSTRAINT `FK_8bff1bb2850fece77f12247f303` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`)
) ENGINE=InnoDB AUTO_INCREMENT=40929 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_countries`
--

DROP TABLE IF EXISTS `result_countries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_countries` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `result_country_id` bigint NOT NULL AUTO_INCREMENT,
  `result_id` bigint NOT NULL,
  `country_role_id` bigint NOT NULL,
  `isoAlpha2` varchar(3) NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`result_country_id`),
  KEY `FK_33a287aea9bff277ec713f53d6b` (`result_id`),
  KEY `FK_782e84f344b86a160580f65ff97` (`country_role_id`),
  KEY `FK_719b6cd4d416c7d97aab42c1d9f` (`isoAlpha2`),
  CONSTRAINT `FK_33a287aea9bff277ec713f53d6b` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`),
  CONSTRAINT `FK_719b6cd4d416c7d97aab42c1d9f` FOREIGN KEY (`isoAlpha2`) REFERENCES `clarisa_countries` (`isoAlpha2`),
  CONSTRAINT `FK_782e84f344b86a160580f65ff97` FOREIGN KEY (`country_role_id`) REFERENCES `country_roles` (`country_role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5881 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_countries_sub_nationals`
--

DROP TABLE IF EXISTS `result_countries_sub_nationals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_countries_sub_nationals` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `result_country_sub_national_id` bigint NOT NULL AUTO_INCREMENT,
  `result_country_id` bigint NOT NULL,
  `sub_national_id` bigint NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`result_country_sub_national_id`),
  KEY `FK_eaf0151a4a0acf4530130aa2b1d` (`result_country_id`),
  KEY `FK_9c1736d35295f1aa95dfc979d60` (`sub_national_id`),
  CONSTRAINT `FK_9c1736d35295f1aa95dfc979d60` FOREIGN KEY (`sub_national_id`) REFERENCES `clarisa_sub_nationals` (`id`),
  CONSTRAINT `FK_eaf0151a4a0acf4530130aa2b1d` FOREIGN KEY (`result_country_id`) REFERENCES `result_countries` (`result_country_id`)
) ENGINE=InnoDB AUTO_INCREMENT=969 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_duplicate_resolution_log`
--

DROP TABLE IF EXISTS `result_duplicate_resolution_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_duplicate_resolution_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `run_id` varchar(64) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `source` varchar(30) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `mode` varchar(20) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `group_key_hash` char(64) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `normalized_public_link` text COLLATE utf8mb4_unicode_520_ci,
  `participants` json NOT NULL,
  `classification` varchar(40) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `winner_result_id` bigint DEFAULT NULL,
  `deciding_rule` varchar(40) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `deciding_result_id` bigint DEFAULT NULL,
  `outcomes` json DEFAULT NULL,
  `deleted_count` int NOT NULL DEFAULT '0',
  `protected_count` int NOT NULL DEFAULT '0',
  `failed_count` int NOT NULL DEFAULT '0',
  `noop_count` int NOT NULL DEFAULT '0',
  `hard_delete_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `confirmation_digest` varchar(64) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `reason` text COLLATE utf8mb4_unicode_520_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_rdrl_run_id` (`run_id`),
  KEY `idx_rdrl_group_key_hash` (`group_key_hash`)
) ENGINE=InnoDB AUTO_INCREMENT=4787 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_evidences`
--

DROP TABLE IF EXISTS `result_evidences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_evidences` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `result_evidence_id` bigint NOT NULL AUTO_INCREMENT,
  `result_id` bigint NOT NULL,
  `evidence_description` text NOT NULL,
  `evidence_url` text NOT NULL,
  `evidence_role_id` bigint NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `is_private` tinyint DEFAULT '0',
  PRIMARY KEY (`result_evidence_id`),
  KEY `FK_4b02d00f23e6c9e2ffc393896ae` (`evidence_role_id`),
  KEY `FK_45b07440b457bf937eccacf9db3` (`result_id`),
  CONSTRAINT `FK_45b07440b457bf937eccacf9db3` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`),
  CONSTRAINT `FK_4b02d00f23e6c9e2ffc393896ae` FOREIGN KEY (`evidence_role_id`) REFERENCES `evidence_roles` (`evidence_role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=18365 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_impact_area_global_target`
--

DROP TABLE IF EXISTS `result_impact_area_global_target`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_impact_area_global_target` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `result_impact_area_id` bigint NOT NULL,
  `global_target_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_6560140b60d32df58a61a6deeb5` (`result_impact_area_id`),
  KEY `FK_f770728be77c77da500192dbec7` (`global_target_id`),
  CONSTRAINT `FK_6560140b60d32df58a61a6deeb5` FOREIGN KEY (`result_impact_area_id`) REFERENCES `result_impact_areas` (`id`),
  CONSTRAINT `FK_f770728be77c77da500192dbec7` FOREIGN KEY (`global_target_id`) REFERENCES `clarisa_global_targets` (`targetId`)
) ENGINE=InnoDB AUTO_INCREMENT=123 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_impact_areas`
--

DROP TABLE IF EXISTS `result_impact_areas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_impact_areas` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `result_id` bigint NOT NULL,
  `impact_area_id` bigint NOT NULL,
  `impact_area_score_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_883426cfeb5571155fece6bde8f` (`result_id`),
  KEY `FK_8df22f18fa8f8ea87bd2cccef9a` (`impact_area_id`),
  KEY `FK_d888a098be6ed482b954dab418d` (`impact_area_score_id`),
  CONSTRAINT `FK_883426cfeb5571155fece6bde8f` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`),
  CONSTRAINT `FK_8df22f18fa8f8ea87bd2cccef9a` FOREIGN KEY (`impact_area_id`) REFERENCES `clarisa_impact_areas` (`id`),
  CONSTRAINT `FK_d888a098be6ed482b954dab418d` FOREIGN KEY (`impact_area_score_id`) REFERENCES `impact_area_scores` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=126 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_impact_outcome_roles`
--

DROP TABLE IF EXISTS `result_impact_outcome_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_impact_outcome_roles` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_impact_outcomes`
--

DROP TABLE IF EXISTS `result_impact_outcomes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_impact_outcomes` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `result_id` bigint NOT NULL,
  `impact_outcome_id` bigint NOT NULL,
  `role_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_f1a19f2f5d9556dee00b4c54d31` (`result_id`),
  KEY `FK_5ea6958c29fe8a4cd313ecc56b6` (`impact_outcome_id`),
  KEY `FK_369474fc117023890a2d72840b3` (`role_id`),
  CONSTRAINT `FK_369474fc117023890a2d72840b3` FOREIGN KEY (`role_id`) REFERENCES `result_impact_outcome_roles` (`id`),
  CONSTRAINT `FK_5ea6958c29fe8a4cd313ecc56b6` FOREIGN KEY (`impact_outcome_id`) REFERENCES `impact_outcomes` (`id`),
  CONSTRAINT `FK_f1a19f2f5d9556dee00b4c54d31` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_initiatives`
--

DROP TABLE IF EXISTS `result_initiatives`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_initiatives` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `result_id` bigint NOT NULL,
  `clarisa_initiative_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_c9e9e5e149c16a44d186942aa40` (`result_id`),
  KEY `FK_ec2e5e1a2bee45a2bdb804d905e` (`clarisa_initiative_id`),
  CONSTRAINT `FK_c9e9e5e149c16a44d186942aa40` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`),
  CONSTRAINT `FK_ec2e5e1a2bee45a2bdb804d905e` FOREIGN KEY (`clarisa_initiative_id`) REFERENCES `clarisa_initiatives` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_innovation_dev`
--

DROP TABLE IF EXISTS `result_innovation_dev`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_innovation_dev` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `result_id` bigint NOT NULL,
  `short_title` text,
  `innovation_nature_id` bigint DEFAULT NULL,
  `innovation_type_id` bigint DEFAULT NULL,
  `innovation_readiness_id` bigint DEFAULT NULL,
  `no_sex_age_disaggregation` tinyint DEFAULT NULL,
  `anticipated_users_id` bigint DEFAULT NULL,
  `expected_outcome` text,
  `intended_beneficiaries_description` text,
  `is_knowledge_sharing` tinyint DEFAULT NULL,
  `dissemination_qualification_id` bigint DEFAULT NULL,
  `tool_useful_context` text,
  `results_achieved_expected` text,
  `is_used_beyond_original_context` tinyint DEFAULT NULL,
  `adoption_adaptation_context` text,
  `other_tools` text,
  `other_tools_integration` text,
  `is_cheaper_than_alternatives` int DEFAULT NULL,
  `is_simpler_to_use` int DEFAULT NULL,
  `does_perform_better` int DEFAULT NULL,
  `is_desirable_to_users` int DEFAULT NULL,
  `has_commercial_viability` int DEFAULT NULL,
  `has_suitable_enabling_environment` int DEFAULT NULL,
  `has_evidence_of_uptake` int DEFAULT NULL,
  `expansion_potential_id` bigint DEFAULT NULL,
  `expansion_adaptation_details` text,
  `is_new_or_improved_variety` tinyint DEFAULT NULL,
  `new_or_improved_varieties_count` bigint DEFAULT NULL,
  `innovation_readiness_explanation` text,
  PRIMARY KEY (`result_id`),
  KEY `FK_9e8b40e61dfa75aafd5eea93af8` (`innovation_nature_id`),
  KEY `FK_6d94a047718567bd95719d91949` (`innovation_type_id`),
  KEY `FK_68ded56103d3a380b783a20ecfc` (`innovation_readiness_id`),
  KEY `FK_dc8dbf9ddb348acc41d3271687c` (`anticipated_users_id`),
  KEY `FK_93780864fa742dc0d5bef294fd9` (`dissemination_qualification_id`),
  KEY `FK_1c12070e405e2fd877105e41b2b` (`expansion_potential_id`),
  CONSTRAINT `FK_1c12070e405e2fd877105e41b2b` FOREIGN KEY (`expansion_potential_id`) REFERENCES `expansion_potentials` (`id`),
  CONSTRAINT `FK_5381d276b900985283614831fb5` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`),
  CONSTRAINT `FK_68ded56103d3a380b783a20ecfc` FOREIGN KEY (`innovation_readiness_id`) REFERENCES `clarisa_innovation_readiness_levels` (`id`),
  CONSTRAINT `FK_6d94a047718567bd95719d91949` FOREIGN KEY (`innovation_type_id`) REFERENCES `clarisa_innovation_types` (`code`),
  CONSTRAINT `FK_93780864fa742dc0d5bef294fd9` FOREIGN KEY (`dissemination_qualification_id`) REFERENCES `dissemination_qualifications` (`id`),
  CONSTRAINT `FK_9e8b40e61dfa75aafd5eea93af8` FOREIGN KEY (`innovation_nature_id`) REFERENCES `clarisa_innovation_characteristics` (`id`),
  CONSTRAINT `FK_dc8dbf9ddb348acc41d3271687c` FOREIGN KEY (`anticipated_users_id`) REFERENCES `innovation_dev_anticipated_users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_innovation_tool_function`
--

DROP TABLE IF EXISTS `result_innovation_tool_function`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_innovation_tool_function` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `innovation_tool_function_id` bigint NOT NULL AUTO_INCREMENT,
  `result_id` bigint NOT NULL,
  `tool_function_id` bigint NOT NULL,
  PRIMARY KEY (`innovation_tool_function_id`),
  KEY `FK_1a9b365c7b4bc67cacb3b0b21c2` (`tool_function_id`),
  KEY `FK_88225e39f2c8ae79a74ce6fd7b1` (`result_id`),
  CONSTRAINT `FK_1a9b365c7b4bc67cacb3b0b21c2` FOREIGN KEY (`tool_function_id`) REFERENCES `tool_functions` (`id`),
  CONSTRAINT `FK_88225e39f2c8ae79a74ce6fd7b1` FOREIGN KEY (`result_id`) REFERENCES `result_innovation_dev` (`result_id`)
) ENGINE=InnoDB AUTO_INCREMENT=79 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_institution_ai`
--

DROP TABLE IF EXISTS `result_institution_ai`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_institution_ai` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `result_id` bigint NOT NULL,
  `institution_id` bigint NOT NULL,
  `institution_role_id` bigint NOT NULL,
  `institution_name` text NOT NULL,
  `score` float NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_e94c400a74f35fe1b942b6b2e26` (`result_id`),
  KEY `FK_783671a33b81f398332cc951b60` (`institution_role_id`),
  CONSTRAINT `FK_783671a33b81f398332cc951b60` FOREIGN KEY (`institution_role_id`) REFERENCES `institution_roles` (`institution_role_id`),
  CONSTRAINT `FK_e94c400a74f35fe1b942b6b2e26` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_institution_types`
--

DROP TABLE IF EXISTS `result_institution_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_institution_types` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `result_institution_type_id` bigint NOT NULL AUTO_INCREMENT,
  `result_id` bigint NOT NULL,
  `institution_type_id` bigint DEFAULT NULL,
  `institution_type_role_id` bigint NOT NULL,
  `sub_institution_type_id` bigint DEFAULT NULL,
  `institution_type_custom_name` text,
  `is_organization_known` tinyint DEFAULT NULL,
  `institution_id` bigint DEFAULT NULL,
  PRIMARY KEY (`result_institution_type_id`),
  KEY `FK_b13f998dc106255fee9782355e2` (`result_id`),
  KEY `FK_12b4fffc9dafb9eabfcf02fd526` (`institution_type_role_id`),
  KEY `FK_9581e238cb40ecc77118f2406f0` (`sub_institution_type_id`),
  KEY `FK_f2806447d550accfa328298dbb9` (`institution_id`),
  KEY `FK_145b6af1c77c6efcd902ef9535d` (`institution_type_id`),
  CONSTRAINT `FK_12b4fffc9dafb9eabfcf02fd526` FOREIGN KEY (`institution_type_role_id`) REFERENCES `institution_type_roles` (`institution_type_role_id`),
  CONSTRAINT `FK_145b6af1c77c6efcd902ef9535d` FOREIGN KEY (`institution_type_id`) REFERENCES `clarisa_institution_types` (`code`),
  CONSTRAINT `FK_9581e238cb40ecc77118f2406f0` FOREIGN KEY (`sub_institution_type_id`) REFERENCES `clarisa_institution_types` (`code`),
  CONSTRAINT `FK_b13f998dc106255fee9782355e2` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`),
  CONSTRAINT `FK_f2806447d550accfa328298dbb9` FOREIGN KEY (`institution_id`) REFERENCES `clarisa_institutions` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=2217 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_institutions`
--

DROP TABLE IF EXISTS `result_institutions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_institutions` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `result_institution_id` bigint NOT NULL AUTO_INCREMENT,
  `result_id` bigint NOT NULL,
  `institution_id` bigint NOT NULL,
  `institution_role_id` bigint NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`result_institution_id`),
  KEY `FK_9f384bc37a87859d6a6c91e64de` (`result_id`),
  KEY `FK_1ad3779da86ab196adf876c4b96` (`institution_id`),
  KEY `FK_bece52a5984c89092fe22337dcf` (`institution_role_id`),
  CONSTRAINT `FK_1ad3779da86ab196adf876c4b96` FOREIGN KEY (`institution_id`) REFERENCES `clarisa_institutions` (`code`),
  CONSTRAINT `FK_9f384bc37a87859d6a6c91e64de` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`),
  CONSTRAINT `FK_bece52a5984c89092fe22337dcf` FOREIGN KEY (`institution_role_id`) REFERENCES `institution_roles` (`institution_role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=21281 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_ip_rights`
--

DROP TABLE IF EXISTS `result_ip_rights`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_ip_rights` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `result_ip_rights_id` bigint NOT NULL,
  `publicity_restriction` tinyint DEFAULT NULL,
  `publicity_restriction_description` text,
  `requires_futher_development` tinyint DEFAULT NULL,
  `requires_futher_development_description` text,
  `asset_ip_owner_id` bigint DEFAULT NULL,
  `asset_ip_owner_description` text,
  `potential_asset` tinyint DEFAULT NULL,
  `potential_asset_description` text,
  `private_sector_engagement_id` bigint DEFAULT NULL,
  `formal_ip_rights_application_id` bigint DEFAULT NULL,
  PRIMARY KEY (`result_ip_rights_id`),
  KEY `FK_7a4b5c76153cd2b0c9ccbef3636` (`asset_ip_owner_id`),
  KEY `FK_0064eb63f492cb8cb8991aa124d` (`private_sector_engagement_id`),
  KEY `FK_467c0131e8ec4c02739543a927a` (`formal_ip_rights_application_id`),
  CONSTRAINT `FK_0064eb63f492cb8cb8991aa124d` FOREIGN KEY (`private_sector_engagement_id`) REFERENCES `ip_rights_application_options` (`id`),
  CONSTRAINT `FK_22066ab65e1978dc1112f460af6` FOREIGN KEY (`result_ip_rights_id`) REFERENCES `results` (`result_id`),
  CONSTRAINT `FK_467c0131e8ec4c02739543a927a` FOREIGN KEY (`formal_ip_rights_application_id`) REFERENCES `ip_rights_application_options` (`id`),
  CONSTRAINT `FK_7a4b5c76153cd2b0c9ccbef3636` FOREIGN KEY (`asset_ip_owner_id`) REFERENCES `intellectual_property_owner` (`intellectual_property_owner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_keywords`
--

DROP TABLE IF EXISTS `result_keywords`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_keywords` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `result_keyword_id` bigint NOT NULL AUTO_INCREMENT,
  `result_id` bigint NOT NULL,
  `keyword` text NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`result_keyword_id`),
  KEY `FK_052c641afdd57cc49af5ad695fe` (`result_id`),
  CONSTRAINT `FK_052c641afdd57cc49af5ad695fe` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`)
) ENGINE=InnoDB AUTO_INCREMENT=55188 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_knowledge_products`
--

DROP TABLE IF EXISTS `result_knowledge_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_knowledge_products` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `result_id` bigint NOT NULL,
  `type` text,
  `citation` text,
  `open_access` tinyint DEFAULT NULL,
  `publication_date` text,
  `access_status` text,
  `collection` text,
  `tip_id` bigint DEFAULT NULL,
  PRIMARY KEY (`result_id`),
  CONSTRAINT `FK_2bd6a097e02384fd99569150bf1` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_languages`
--

DROP TABLE IF EXISTS `result_languages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_languages` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `result_language_id` bigint NOT NULL AUTO_INCREMENT,
  `result_id` bigint NOT NULL,
  `language_id` bigint NOT NULL,
  `language_role_id` bigint NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`result_language_id`),
  KEY `FK_d6d367a06450fd6ff450f4772cf` (`result_id`),
  KEY `FK_f2d8235737587e8b9f9298a0237` (`language_id`),
  KEY `FK_32b54272e60fe04f2d36b642f80` (`language_role_id`),
  CONSTRAINT `FK_32b54272e60fe04f2d36b642f80` FOREIGN KEY (`language_role_id`) REFERENCES `language_roles` (`language_role_id`),
  CONSTRAINT `FK_d6d367a06450fd6ff450f4772cf` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`),
  CONSTRAINT `FK_f2d8235737587e8b9f9298a0237` FOREIGN KEY (`language_id`) REFERENCES `clarisa_languages` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1409 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_lever_sdg_targets`
--

DROP TABLE IF EXISTS `result_lever_sdg_targets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_lever_sdg_targets` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `result_lever_sdg_target_id` bigint NOT NULL AUTO_INCREMENT,
  `result_lever_id` bigint NOT NULL,
  `sdg_target_id` bigint NOT NULL,
  PRIMARY KEY (`result_lever_sdg_target_id`),
  KEY `FK_dcb2055145b60b1cbb003b9a37a` (`result_lever_id`),
  KEY `FK_7dbd3494864c2245863649bd1e2` (`sdg_target_id`),
  CONSTRAINT `FK_7dbd3494864c2245863649bd1e2` FOREIGN KEY (`sdg_target_id`) REFERENCES `clarisa_sdg_targets` (`id`),
  CONSTRAINT `FK_dcb2055145b60b1cbb003b9a37a` FOREIGN KEY (`result_lever_id`) REFERENCES `result_levers` (`result_lever_id`)
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_lever_strategic_outcome`
--

DROP TABLE IF EXISTS `result_lever_strategic_outcome`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_lever_strategic_outcome` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `result_lever_id` bigint DEFAULT NULL,
  `lever_strategic_outcome_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_881dce61dbdc4a0c4cc7adb55d6` (`result_lever_id`),
  KEY `FK_67929086ebe6a0b7f4f5aeff096` (`lever_strategic_outcome_id`),
  CONSTRAINT `FK_67929086ebe6a0b7f4f5aeff096` FOREIGN KEY (`lever_strategic_outcome_id`) REFERENCES `lever_strategic_outcome` (`id`),
  CONSTRAINT `FK_881dce61dbdc4a0c4cc7adb55d6` FOREIGN KEY (`result_lever_id`) REFERENCES `result_levers` (`result_lever_id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_levers`
--

DROP TABLE IF EXISTS `result_levers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_levers` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `result_lever_id` bigint NOT NULL AUTO_INCREMENT,
  `result_id` bigint NOT NULL,
  `lever_role_id` bigint NOT NULL,
  `lever_id` bigint NOT NULL,
  `is_primary` tinyint NOT NULL DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `custom_lever_name` text,
  PRIMARY KEY (`result_lever_id`),
  KEY `FK_90e5a6d5b053612e54042ac56ac` (`lever_role_id`),
  KEY `FK_f5e1200952e369aa022a5014f94` (`result_id`),
  KEY `FK_e1fc97f82440f07c53e8b4876e8` (`lever_id`),
  CONSTRAINT `FK_90e5a6d5b053612e54042ac56ac` FOREIGN KEY (`lever_role_id`) REFERENCES `lever_roles` (`lever_role_id`),
  CONSTRAINT `FK_e1fc97f82440f07c53e8b4876e8` FOREIGN KEY (`lever_id`) REFERENCES `clarisa_levers` (`id`),
  CONSTRAINT `FK_f5e1200952e369aa022a5014f94` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`)
) ENGINE=InnoDB AUTO_INCREMENT=43716 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_notable_references`
--

DROP TABLE IF EXISTS `result_notable_references`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_notable_references` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `notable_reference_type_id` bigint DEFAULT NULL,
  `link` text,
  `result_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_8240397f70df29ad780857bc0be` (`result_id`),
  KEY `FK_36365b324bdec8468c999cc6856` (`notable_reference_type_id`),
  CONSTRAINT `FK_36365b324bdec8468c999cc6856` FOREIGN KEY (`notable_reference_type_id`) REFERENCES `notable_reference_types` (`id`),
  CONSTRAINT `FK_8240397f70df29ad780857bc0be` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`)
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_oicrs`
--

DROP TABLE IF EXISTS `result_oicrs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_oicrs` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `result_id` bigint NOT NULL COMMENT 'The unique identifier for the result',
  `outcome_impact_statement` text COMMENT 'Elaboration of outcome/impact statement',
  `general_comment` text COMMENT 'General comment on the result',
  `oicr_internal_code` text COMMENT 'OICR internal code for the result',
  `short_outcome_impact_statement` text COMMENT 'Short Outcome/Impact Statement',
  `maturity_level_id` bigint DEFAULT NULL,
  `elaboration_narrative` text,
  `mel_regional_expert` varchar(10) DEFAULT NULL,
  `sharepoint_link` text,
  `mel_staff_group_id` bigint DEFAULT NULL,
  `for_external_use` tinyint DEFAULT NULL,
  `for_external_use_description` text,
  `cgspace_link` text,
  PRIMARY KEY (`result_id`),
  KEY `FK_1a73e59f1bdbd24f71d9e87390b` (`maturity_level_id`),
  KEY `FK_e25b1a65bd80f2f692aa6044dc9` (`mel_regional_expert`,`mel_staff_group_id`),
  CONSTRAINT `FK_1a73e59f1bdbd24f71d9e87390b` FOREIGN KEY (`maturity_level_id`) REFERENCES `maturity_levels` (`id`),
  CONSTRAINT `FK_3271a4f61ca7b4139e5a948ab73` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`),
  CONSTRAINT `FK_e25b1a65bd80f2f692aa6044dc9` FOREIGN KEY (`mel_regional_expert`, `mel_staff_group_id`) REFERENCES `alliance_user_staff_groups` (`carnet`, `staff_group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_policy_change`
--

DROP TABLE IF EXISTS `result_policy_change`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_policy_change` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `result_id` bigint NOT NULL,
  `policy_type_id` bigint DEFAULT NULL,
  `policy_stage_id` bigint DEFAULT NULL,
  `evidence_stage` text,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`result_id`),
  KEY `FK_be917b2af3281b0ebb6593926fd` (`policy_type_id`),
  KEY `FK_ff3673c8a9eaee0730b1f995476` (`policy_stage_id`),
  CONSTRAINT `FK_8918f8668f7b3d862de878b1795` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`),
  CONSTRAINT `FK_be917b2af3281b0ebb6593926fd` FOREIGN KEY (`policy_type_id`) REFERENCES `policy_types` (`policy_type_id`),
  CONSTRAINT `FK_ff3673c8a9eaee0730b1f995476` FOREIGN KEY (`policy_stage_id`) REFERENCES `policy_stage` (`policy_stage_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_pool_funding_alignment`
--

DROP TABLE IF EXISTS `result_pool_funding_alignment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_pool_funding_alignment` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `result_id` bigint NOT NULL,
  `has_contribution` tinyint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_result_pool_funding_alignment_result` (`result_id`),
  CONSTRAINT `fk_rpfa_result` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`)
) ENGINE=InnoDB AUTO_INCREMENT=58 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_pool_funding_alignment_sp`
--

DROP TABLE IF EXISTS `result_pool_funding_alignment_sp`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_pool_funding_alignment_sp` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `alignment_id` bigint NOT NULL,
  `sp_code` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `sp_role` varchar(20) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `active_primary_alignment` bigint GENERATED ALWAYS AS (if(((`is_active` = 1) and (`sp_role` = _utf8mb4'PRIMARY')),`alignment_id`,NULL)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_rpfas_active_primary` (`active_primary_alignment`),
  KEY `idx_result_pool_funding_alignment_sp_alignment` (`alignment_id`),
  KEY `idx_result_pool_funding_alignment_sp_sp` (`sp_code`),
  CONSTRAINT `fk_rpfas_alignment` FOREIGN KEY (`alignment_id`) REFERENCES `result_pool_funding_alignment` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=89 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_pool_funding_indicator_mapping`
--

DROP TABLE IF EXISTS `result_pool_funding_indicator_mapping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_pool_funding_indicator_mapping` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `result_id` bigint NOT NULL,
  `lever_code` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `indicator_code` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `indicator_type` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `result_capacity_sharing_id` bigint DEFAULT NULL,
  `result_knowledge_product_id` bigint DEFAULT NULL,
  `result_policy_change_id` bigint DEFAULT NULL,
  `result_innovation_dev_id` bigint DEFAULT NULL,
  `other_contribution_narrative` text COLLATE utf8mb4_unicode_520_ci,
  `is_stale` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rpfim_result_indicator_active` (`result_id`,`lever_code`,`indicator_code`,`is_active`),
  KEY `idx_rpfim_result` (`result_id`),
  KEY `idx_rpfim_indicator` (`lever_code`,`indicator_code`),
  KEY `idx_rpfim_stale` (`is_stale`),
  KEY `fk_rpfim_capacity_sharing` (`result_capacity_sharing_id`),
  KEY `fk_rpfim_knowledge_product` (`result_knowledge_product_id`),
  KEY `fk_rpfim_policy_change` (`result_policy_change_id`),
  KEY `fk_rpfim_innovation_dev` (`result_innovation_dev_id`),
  CONSTRAINT `fk_rpfim_capacity_sharing` FOREIGN KEY (`result_capacity_sharing_id`) REFERENCES `result_capacity_sharing` (`result_id`),
  CONSTRAINT `fk_rpfim_innovation_dev` FOREIGN KEY (`result_innovation_dev_id`) REFERENCES `result_innovation_dev` (`result_id`),
  CONSTRAINT `fk_rpfim_knowledge_product` FOREIGN KEY (`result_knowledge_product_id`) REFERENCES `result_knowledge_products` (`result_id`),
  CONSTRAINT `fk_rpfim_policy_change` FOREIGN KEY (`result_policy_change_id`) REFERENCES `result_policy_change` (`result_id`),
  CONSTRAINT `fk_rpfim_result` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_pool_funding_toc_alignment`
--

DROP TABLE IF EXISTS `result_pool_funding_toc_alignment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_pool_funding_toc_alignment` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `result_id` bigint NOT NULL,
  `sp_code` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `aligns_with_toc` tinyint(1) NOT NULL,
  `level` varchar(10) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `toc_result_id` int DEFAULT NULL,
  `indicator_id` int DEFAULT NULL,
  `quantitative_contribution` decimal(18,2) DEFAULT NULL,
  `toc_result_title` text COLLATE utf8mb4_unicode_520_ci,
  `indicator_description` text COLLATE utf8mb4_unicode_520_ci,
  `unit_messurament` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `target_value` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `target_year` int DEFAULT NULL,
  `active_result_sp` varchar(71) COLLATE utf8mb4_unicode_520_ci GENERATED ALWAYS AS (if((`is_active` = 1),concat(`result_id`,_utf8mb4':',`sp_code`),NULL)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_rpfta_active_result_sp` (`active_result_sp`),
  KEY `idx_rpfta_result` (`result_id`),
  CONSTRAINT `fk_rpfta_result` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`)
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_quantifications`
--

DROP TABLE IF EXISTS `result_quantifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_quantifications` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `quantification_number` bigint DEFAULT NULL,
  `unit` text,
  `description` text,
  `result_id` bigint NOT NULL,
  `quantification_role_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_8aa7d9122b10db5299e44ccf7ae` (`result_id`),
  KEY `FK_486a03e0bec68eb135c38e6f022` (`quantification_role_id`),
  CONSTRAINT `FK_486a03e0bec68eb135c38e6f022` FOREIGN KEY (`quantification_role_id`) REFERENCES `quantification_roles` (`id`),
  CONSTRAINT `FK_8aa7d9122b10db5299e44ccf7ae` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`)
) ENGINE=InnoDB AUTO_INCREMENT=83 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_regions`
--

DROP TABLE IF EXISTS `result_regions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_regions` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `result_region_id` bigint NOT NULL AUTO_INCREMENT,
  `result_id` bigint NOT NULL,
  `region_id` bigint NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`result_region_id`),
  KEY `FK_78da652c2448d576166d9996149` (`result_id`),
  KEY `FK_7b3acd83a1ef704fbc99f1a8b82` (`region_id`),
  CONSTRAINT `FK_78da652c2448d576166d9996149` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`),
  CONSTRAINT `FK_7b3acd83a1ef704fbc99f1a8b82` FOREIGN KEY (`region_id`) REFERENCES `clarisa_regions` (`um49Code`)
) ENGINE=InnoDB AUTO_INCREMENT=24555 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_review_history`
--

DROP TABLE IF EXISTS `result_review_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_review_history` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `result_id` bigint NOT NULL,
  `version_id` bigint DEFAULT NULL,
  `actor_user_id` bigint NOT NULL,
  `event_type` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `decision` varchar(20) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `justification` text COLLATE utf8mb4_unicode_520_ci,
  `payload_before` json DEFAULT NULL,
  `payload_after` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_result_review_history_result_created` (`result_id`,`created_at`),
  KEY `idx_result_review_history_event_type` (`event_type`),
  CONSTRAINT `fk_rrh_result` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`)
) ENGINE=InnoDB AUTO_INCREMENT=58 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_sdgs`
--

DROP TABLE IF EXISTS `result_sdgs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_sdgs` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `result_sdg_id` bigint NOT NULL AUTO_INCREMENT,
  `result_id` bigint NOT NULL,
  `clarisa_sdg_id` bigint NOT NULL,
  PRIMARY KEY (`result_sdg_id`),
  KEY `FK_67827d5f61559d57fd76c78452d` (`result_id`),
  KEY `FK_e50d1b05127952b3873b3010c5f` (`clarisa_sdg_id`),
  CONSTRAINT `FK_67827d5f61559d57fd76c78452d` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`),
  CONSTRAINT `FK_e50d1b05127952b3873b3010c5f` FOREIGN KEY (`clarisa_sdg_id`) REFERENCES `clarisa_sdgs` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=58407 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_status`
--

DROP TABLE IF EXISTS `result_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_status` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `result_status_id` bigint NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `editable_roles` json DEFAULT NULL,
  `config` json DEFAULT NULL,
  `action_description` text,
  PRIMARY KEY (`result_status_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_status_transitions`
--

DROP TABLE IF EXISTS `result_status_transitions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_status_transitions` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `from_status_id` bigint NOT NULL,
  `to_status_id` bigint NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_status_workflow`
--

DROP TABLE IF EXISTS `result_status_workflow`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_status_workflow` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `indicator_id` bigint NOT NULL,
  `from_status_id` bigint NOT NULL,
  `to_status_id` bigint NOT NULL,
  `config` json DEFAULT NULL,
  `is_editable_date` tinyint NOT NULL DEFAULT '0',
  `is_status_change_validation_required` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `FK_de70ac095d28e247f88df095be4` (`indicator_id`),
  KEY `FK_765e7c10868a1d97b08fdb92c32` (`from_status_id`),
  KEY `FK_d4bd6a0015441dcca0bb3f61901` (`to_status_id`),
  CONSTRAINT `FK_765e7c10868a1d97b08fdb92c32` FOREIGN KEY (`from_status_id`) REFERENCES `result_status` (`result_status_id`),
  CONSTRAINT `FK_d4bd6a0015441dcca0bb3f61901` FOREIGN KEY (`to_status_id`) REFERENCES `result_status` (`result_status_id`),
  CONSTRAINT `FK_de70ac095d28e247f88df095be4` FOREIGN KEY (`indicator_id`) REFERENCES `indicators` (`indicator_id`)
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_strategic_objective_roles`
--

DROP TABLE IF EXISTS `result_strategic_objective_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_strategic_objective_roles` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_strategic_objectives`
--

DROP TABLE IF EXISTS `result_strategic_objectives`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_strategic_objectives` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `result_id` bigint NOT NULL,
  `strategic_objective_id` bigint NOT NULL,
  `role_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_f533df2b0cbca7d2d9cdc8d4308` (`result_id`),
  KEY `FK_02f95e3c5be0ca75ab8b8673042` (`strategic_objective_id`),
  KEY `FK_cb8579b47b3f7bc605663ca53b0` (`role_id`),
  CONSTRAINT `FK_02f95e3c5be0ca75ab8b8673042` FOREIGN KEY (`strategic_objective_id`) REFERENCES `strategic_objectives` (`id`),
  CONSTRAINT `FK_cb8579b47b3f7bc605663ca53b0` FOREIGN KEY (`role_id`) REFERENCES `result_strategic_objective_roles` (`id`),
  CONSTRAINT `FK_f533df2b0cbca7d2d9cdc8d4308` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_tags`
--

DROP TABLE IF EXISTS `result_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_tags` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `result_id` bigint NOT NULL,
  `tag_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_f6520a6cc644909c5e25197c8ca` (`tag_id`),
  KEY `FK_9cb8ca62f545000e4ef67d0ccc0` (`result_id`),
  CONSTRAINT `FK_9cb8ca62f545000e4ef67d0ccc0` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`),
  CONSTRAINT `FK_f6520a6cc644909c5e25197c8ca` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=338 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_user_ai`
--

DROP TABLE IF EXISTS `result_user_ai`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_user_ai` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `result_id` bigint NOT NULL,
  `institution_id` varchar(10) NOT NULL,
  `user_role_id` bigint NOT NULL,
  `institution_name` text NOT NULL,
  `score` float NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_2f547cf55695a82c4eaa5facfc2` (`result_id`),
  KEY `FK_2593bdbeefdaeec9150ec6c84af` (`user_role_id`),
  CONSTRAINT `FK_2593bdbeefdaeec9150ec6c84af` FOREIGN KEY (`user_role_id`) REFERENCES `user_roles` (`user_role_id`),
  CONSTRAINT `FK_2f547cf55695a82c4eaa5facfc2` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `result_users`
--

DROP TABLE IF EXISTS `result_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `result_users` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `result_user_id` bigint NOT NULL AUTO_INCREMENT,
  `result_id` bigint NOT NULL,
  `user_role_id` bigint NOT NULL,
  `user_id` varchar(10) NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `informative_role_id` bigint DEFAULT NULL,
  PRIMARY KEY (`result_user_id`),
  KEY `FK_f8cbbf90686d2db058efb2038f8` (`result_id`),
  KEY `FK_250fbc1acb9b1bd5129e8e1f53f` (`user_role_id`),
  KEY `FK_38df5e77e4ba64b978844dbf134` (`user_id`),
  KEY `FK_c3ae4d70fca8fb9167466d92f98` (`informative_role_id`),
  CONSTRAINT `FK_250fbc1acb9b1bd5129e8e1f53f` FOREIGN KEY (`user_role_id`) REFERENCES `user_roles` (`user_role_id`),
  CONSTRAINT `FK_38df5e77e4ba64b978844dbf134` FOREIGN KEY (`user_id`) REFERENCES `alliance_user_staff` (`carnet`),
  CONSTRAINT `FK_c3ae4d70fca8fb9167466d92f98` FOREIGN KEY (`informative_role_id`) REFERENCES `informative_roles` (`id`),
  CONSTRAINT `FK_f8cbbf90686d2db058efb2038f8` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12196 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `results`
--

DROP TABLE IF EXISTS `results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `results` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `result_id` bigint NOT NULL AUTO_INCREMENT,
  `result_official_code` bigint NOT NULL,
  `version_id` bigint DEFAULT NULL,
  `title` text,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `indicator_id` bigint DEFAULT NULL,
  `geo_scope_id` bigint DEFAULT NULL,
  `result_status_id` bigint DEFAULT '4',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `report_year_id` year DEFAULT NULL,
  `tip_id` bigint DEFAULT NULL,
  `is_snapshot` tinyint DEFAULT NULL,
  `is_ai` tinyint DEFAULT '0',
  `comment_geo_scope` text,
  `platform_code` varchar(50) DEFAULT NULL,
  `is_partner_not_applicable` tinyint DEFAULT NULL,
  `external_link` text,
  `public_link` text,
  `is_synced_to_prms` tinyint NOT NULL DEFAULT '0',
  `prms_result_code` bigint DEFAULT NULL,
  PRIMARY KEY (`result_id`),
  KEY `FK_d2e8a705ce8be71c6a65c925b03` (`indicator_id`),
  KEY `FK_102fdfa0f37221bc7dfe8ab6ab8` (`geo_scope_id`),
  KEY `FK_eab8f24e6a43d1723dc22df1eaa` (`report_year_id`),
  KEY `FK_f2652ffd1160a8da41e32a439c5` (`result_status_id`),
  KEY `FK_910c86d61c81c1ae876b40e8e33` (`platform_code`),
  KEY `idx_results_official_code_snapshot_report_year` (`result_official_code`,`is_snapshot`,`report_year_id`),
  KEY `idx_results_snapshot_active_report_year` (`is_snapshot`,`is_active`,`report_year_id`),
  KEY `idx_results_synced_to_prms` (`is_synced_to_prms`),
  CONSTRAINT `FK_102fdfa0f37221bc7dfe8ab6ab8` FOREIGN KEY (`geo_scope_id`) REFERENCES `clarisa_geo_scope` (`code`),
  CONSTRAINT `FK_910c86d61c81c1ae876b40e8e33` FOREIGN KEY (`platform_code`) REFERENCES `reporting_platforms` (`platform_code`),
  CONSTRAINT `FK_d2e8a705ce8be71c6a65c925b03` FOREIGN KEY (`indicator_id`) REFERENCES `indicators` (`indicator_id`),
  CONSTRAINT `FK_eab8f24e6a43d1723dc22df1eaa` FOREIGN KEY (`report_year_id`) REFERENCES `report_years` (`report_year`),
  CONSTRAINT `FK_f2652ffd1160a8da41e32a439c5` FOREIGN KEY (`result_status_id`) REFERENCES `result_status` (`result_status_id`)
) ENGINE=InnoDB AUTO_INCREMENT=33540 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sec_element_types`
--

DROP TABLE IF EXISTS `sec_element_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sec_element_types` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `justification_update` text,
  `sec_element_type_id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `can_create` tinyint NOT NULL DEFAULT '0',
  `can_read` tinyint NOT NULL DEFAULT '0',
  `can_update` tinyint NOT NULL DEFAULT '0',
  `can_delete` tinyint NOT NULL DEFAULT '0',
  `can_execute` tinyint NOT NULL DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`sec_element_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sec_endpoint_permissions`
--

DROP TABLE IF EXISTS `sec_endpoint_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sec_endpoint_permissions` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `sec_endpoint_permissions_id` bigint NOT NULL AUTO_INCREMENT,
  `endpoint` text NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`sec_endpoint_permissions_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sec_entity_types`
--

DROP TABLE IF EXISTS `sec_entity_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sec_entity_types` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `justification_update` text,
  `sec_entity_type_id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`sec_entity_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sec_organizational_entities`
--

DROP TABLE IF EXISTS `sec_organizational_entities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sec_organizational_entities` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `sec_organizational_entity_id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `parent_id` bigint NOT NULL,
  `entity_type_id` bigint NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`sec_organizational_entity_id`),
  KEY `FK_9459e494f6aafabdb8bcb688f61` (`parent_id`),
  KEY `FK_4eb051f7629dda0a528a1e3846d` (`entity_type_id`),
  CONSTRAINT `FK_4eb051f7629dda0a528a1e3846d` FOREIGN KEY (`entity_type_id`) REFERENCES `sec_entity_types` (`sec_entity_type_id`),
  CONSTRAINT `FK_9459e494f6aafabdb8bcb688f61` FOREIGN KEY (`parent_id`) REFERENCES `sec_organizational_entities` (`sec_organizational_entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sec_refresh_tokens`
--

DROP TABLE IF EXISTS `sec_refresh_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sec_refresh_tokens` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `refresh_token_code` varchar(36) NOT NULL,
  `user_id` bigint NOT NULL,
  `expires_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`refresh_token_code`),
  KEY `FK_10b96f26806d867fded46f26414` (`user_id`),
  CONSTRAINT `FK_10b96f26806d867fded46f26414` FOREIGN KEY (`user_id`) REFERENCES `sec_users` (`sec_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sec_role_endpoint_permissions`
--

DROP TABLE IF EXISTS `sec_role_endpoint_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sec_role_endpoint_permissions` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `sec_role_endpoint_permissions_id` bigint NOT NULL AUTO_INCREMENT,
  `role_id` bigint NOT NULL,
  `endpoint_permissions_id` bigint NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`sec_role_endpoint_permissions_id`),
  KEY `FK_ef556eeaee16bac001e0c24e693` (`endpoint_permissions_id`),
  KEY `FK_407d144cc8e6ad98bcb81f405f7` (`role_id`),
  CONSTRAINT `FK_407d144cc8e6ad98bcb81f405f7` FOREIGN KEY (`role_id`) REFERENCES `sec_roles` (`sec_role_id`),
  CONSTRAINT `FK_ef556eeaee16bac001e0c24e693` FOREIGN KEY (`endpoint_permissions_id`) REFERENCES `sec_endpoint_permissions` (`sec_endpoint_permissions_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sec_role_focus`
--

DROP TABLE IF EXISTS `sec_role_focus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sec_role_focus` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `justification_update` text,
  `sec_role_focus_id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`sec_role_focus_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sec_role_functional_permissions`
--

DROP TABLE IF EXISTS `sec_role_functional_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sec_role_functional_permissions` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `sec_role_functional_permission_id` bigint NOT NULL AUTO_INCREMENT,
  `role_id` bigint NOT NULL,
  `view_configuration_code` varchar(36) NOT NULL,
  `create` enum('true','false','N/A') NOT NULL DEFAULT 'false',
  `read` enum('true','false','N/A') NOT NULL DEFAULT 'false',
  `update` enum('true','false','N/A') NOT NULL DEFAULT 'false',
  `delete` enum('true','false','N/A') NOT NULL DEFAULT 'false',
  `execute` enum('true','false','N/A') NOT NULL DEFAULT 'false',
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`sec_role_functional_permission_id`),
  KEY `FK_5518874fe235ff5f4ab50d0b72d` (`role_id`),
  KEY `FK_b2fecd88783807a25cdd13d965c` (`view_configuration_code`),
  CONSTRAINT `FK_5518874fe235ff5f4ab50d0b72d` FOREIGN KEY (`role_id`) REFERENCES `sec_roles` (`sec_role_id`),
  CONSTRAINT `FK_b2fecd88783807a25cdd13d965c` FOREIGN KEY (`view_configuration_code`) REFERENCES `sec_view_configurations` (`sec_view_configuration_code`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sec_roles`
--

DROP TABLE IF EXISTS `sec_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sec_roles` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `justification_update` text,
  `sec_role_id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(60) NOT NULL,
  `focus_id` bigint NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `description` text,
  `is_internal` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`sec_role_id`),
  KEY `FK_8d85c35e518326985ef3bff6409` (`focus_id`),
  CONSTRAINT `FK_8d85c35e518326985ef3bff6409` FOREIGN KEY (`focus_id`) REFERENCES `sec_role_focus` (`sec_role_focus_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sec_template`
--

DROP TABLE IF EXISTS `sec_template`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sec_template` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `sec_template_id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `description` text,
  `template` text NOT NULL,
  `parent_id` bigint DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`sec_template_id`),
  KEY `FK_865ef44747b8f7c2f95a95c19b9` (`parent_id`),
  CONSTRAINT `FK_865ef44747b8f7c2f95a95c19b9` FOREIGN KEY (`parent_id`) REFERENCES `sec_template` (`sec_template_id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sec_user_role_contracts`
--

DROP TABLE IF EXISTS `sec_user_role_contracts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sec_user_role_contracts` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `sec_user_role_contract_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `role_id` bigint NOT NULL,
  `contract_id` varchar(35) NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`sec_user_role_contract_id`),
  KEY `FK_140cb4cffa6b089e9a4ed98c974` (`user_id`),
  KEY `FK_c97c293187f9441a5042fdfbb9a` (`role_id`),
  CONSTRAINT `FK_140cb4cffa6b089e9a4ed98c974` FOREIGN KEY (`user_id`) REFERENCES `sec_users` (`sec_user_id`),
  CONSTRAINT `FK_c97c293187f9441a5042fdfbb9a` FOREIGN KEY (`role_id`) REFERENCES `sec_roles` (`sec_role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1401 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sec_user_role_results`
--

DROP TABLE IF EXISTS `sec_user_role_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sec_user_role_results` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `sec_user_role_result_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `role_id` bigint NOT NULL,
  `result_id` bigint DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`sec_user_role_result_id`),
  KEY `FK_0922064f9e8dcbf31aa632d133b` (`user_id`),
  KEY `FK_ca49d90106dcd61de11e277d9dc` (`role_id`),
  CONSTRAINT `FK_0922064f9e8dcbf31aa632d133b` FOREIGN KEY (`user_id`) REFERENCES `sec_users` (`sec_user_id`),
  CONSTRAINT `FK_ca49d90106dcd61de11e277d9dc` FOREIGN KEY (`role_id`) REFERENCES `sec_roles` (`sec_role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sec_user_roles`
--

DROP TABLE IF EXISTS `sec_user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sec_user_roles` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `sec_user_role_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `role_id` bigint NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`sec_user_role_id`),
  KEY `FK_8934d8a0d6f1714bdd15e8343bb` (`user_id`),
  KEY `FK_4bdf3256ec7d5b63ff875a2930c` (`role_id`),
  CONSTRAINT `FK_4bdf3256ec7d5b63ff875a2930c` FOREIGN KEY (`role_id`) REFERENCES `sec_roles` (`sec_role_id`),
  CONSTRAINT `FK_8934d8a0d6f1714bdd15e8343bb` FOREIGN KEY (`user_id`) REFERENCES `sec_users` (`sec_user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=207 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sec_users`
--

DROP TABLE IF EXISTS `sec_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sec_users` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `sec_user_id` bigint NOT NULL AUTO_INCREMENT,
  `first_name` varchar(60) DEFAULT NULL,
  `last_name` varchar(60) DEFAULT NULL,
  `email` varchar(150) NOT NULL,
  `status_id` bigint DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `last_login_at` timestamp NULL DEFAULT NULL,
  `carnet` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`sec_user_id`),
  KEY `FK_20a43565a31e1df8234e4fefe7b` (`status_id`),
  CONSTRAINT `FK_20a43565a31e1df8234e4fefe7b` FOREIGN KEY (`status_id`) REFERENCES `user_status` (`user_status_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1094 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sec_view_configurations`
--

DROP TABLE IF EXISTS `sec_view_configurations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sec_view_configurations` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `sec_view_configuration_code` varchar(36) NOT NULL,
  `parentSecViewConfigurationCode` varchar(36) DEFAULT NULL,
  `client_element_code` varchar(100) NOT NULL,
  `element_type_id` bigint DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`sec_view_configuration_code`),
  KEY `FK_20d86062977103fd10ffff4f0a5` (`element_type_id`),
  KEY `FK_e672820204f8cfaa202b59bae4d` (`parentSecViewConfigurationCode`),
  CONSTRAINT `FK_20d86062977103fd10ffff4f0a5` FOREIGN KEY (`element_type_id`) REFERENCES `sec_element_types` (`sec_element_type_id`),
  CONSTRAINT `FK_e672820204f8cfaa202b59bae4d` FOREIGN KEY (`parentSecViewConfigurationCode`) REFERENCES `sec_view_configurations` (`sec_view_configuration_code`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sec_view_configurations_closure`
--

DROP TABLE IF EXISTS `sec_view_configurations_closure`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sec_view_configurations_closure` (
  `sec_view_configuration_code_ancestor` varchar(36) NOT NULL,
  `sec_view_configuration_code_descendant` varchar(36) NOT NULL,
  PRIMARY KEY (`sec_view_configuration_code_ancestor`,`sec_view_configuration_code_descendant`),
  KEY `IDX_b1252fe40ea37147aff15f9814` (`sec_view_configuration_code_ancestor`),
  KEY `IDX_8da70cc07c55e6552e195706be` (`sec_view_configuration_code_descendant`),
  CONSTRAINT `FK_8da70cc07c55e6552e195706be4` FOREIGN KEY (`sec_view_configuration_code_descendant`) REFERENCES `sec_view_configurations` (`sec_view_configuration_code`) ON DELETE CASCADE,
  CONSTRAINT `FK_b1252fe40ea37147aff15f9814a` FOREIGN KEY (`sec_view_configuration_code_ancestor`) REFERENCES `sec_view_configurations` (`sec_view_configuration_code`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `session_formats`
--

DROP TABLE IF EXISTS `session_formats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `session_formats` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `session_format_id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`session_format_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `session_lengths`
--

DROP TABLE IF EXISTS `session_lengths`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `session_lengths` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `session_length_id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`session_length_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `session_purposes`
--

DROP TABLE IF EXISTS `session_purposes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `session_purposes` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `session_purpose_id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`session_purpose_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `session_types`
--

DROP TABLE IF EXISTS `session_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `session_types` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `session_type_id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`session_type_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `setting_keys`
--

DROP TABLE IF EXISTS `setting_keys`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `setting_keys` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `key` varchar(50) NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `staff_groups`
--

DROP TABLE IF EXISTS `staff_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff_groups` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `strategic_objectives`
--

DROP TABLE IF EXISTS `strategic_objectives`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `strategic_objectives` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `description` text,
  `portfolio_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_f04a98abced7f5da968dcb0b89e` (`portfolio_id`),
  CONSTRAINT `FK_f04a98abced7f5da968dcb0b89e` FOREIGN KEY (`portfolio_id`) REFERENCES `portfolios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `submission_history`
--

DROP TABLE IF EXISTS `submission_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `submission_history` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `submission_history_id` bigint NOT NULL AUTO_INCREMENT,
  `result_id` bigint NOT NULL,
  `submission_comment` text,
  `from_status_id` bigint NOT NULL,
  `to_status_id` bigint NOT NULL,
  `custom_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`submission_history_id`),
  KEY `FK_b27650ef8dae6ff5723619927a3` (`result_id`),
  KEY `FK_0e7d46ad239a7b21a5ae8c68d22` (`from_status_id`),
  KEY `FK_5fed66685902779bb341511b8a8` (`to_status_id`),
  CONSTRAINT `FK_0e7d46ad239a7b21a5ae8c68d22` FOREIGN KEY (`from_status_id`) REFERENCES `result_status` (`result_status_id`),
  CONSTRAINT `FK_5fed66685902779bb341511b8a8` FOREIGN KEY (`to_status_id`) REFERENCES `result_status` (`result_status_id`),
  CONSTRAINT `FK_b27650ef8dae6ff5723619927a3` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4908 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `submission_history_log`
--

DROP TABLE IF EXISTS `submission_history_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `submission_history_log` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `submission_history_id` bigint NOT NULL,
  `new_date` timestamp NULL DEFAULT NULL,
  `old_date` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sync_process_logs`
--

DROP TABLE IF EXISTS `sync_process_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sync_process_logs` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `process_name` text NOT NULL,
  `created_records` bigint NOT NULL,
  `updated_records` bigint NOT NULL,
  `total_records` bigint NOT NULL,
  `success_records` bigint NOT NULL,
  `error_records` bigint NOT NULL,
  `process_status` text,
  `omitted_duplicate_records` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=194 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sync_staging_records`
--

DROP TABLE IF EXISTS `sync_staging_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sync_staging_records` (
  `execution_code` varchar(36) NOT NULL,
  `code` bigint NOT NULL,
  `year` bigint NOT NULL,
  `data` json NOT NULL,
  PRIMARY KEY (`execution_code`,`code`,`year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tags`
--

DROP TABLE IF EXISTS `tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tags` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `temp_result_ai`
--

DROP TABLE IF EXISTS `temp_result_ai`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `temp_result_ai` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `processed_object` json NOT NULL,
  `raw_object` json NOT NULL,
  `result_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_dccf8d98579bd84f0c299ac9fc3` (`result_id`),
  CONSTRAINT `FK_dccf8d98579bd84f0c299ac9fc3` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`)
) ENGINE=InnoDB AUTO_INCREMENT=926 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tool_functions`
--

DROP TABLE IF EXISTS `tool_functions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tool_functions` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_agresso_contract`
--

DROP TABLE IF EXISTS `user_agresso_contract`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_agresso_contract` (
  `user_agresso_contract_id` bigint NOT NULL AUTO_INCREMENT,
  `agreement_id` varchar(36) NOT NULL,
  `user_id` bigint NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`user_agresso_contract_id`),
  KEY `user_agresso_contract_pkey` (`agreement_id`,`user_id`),
  CONSTRAINT `FK_cca0330a53abf0648e997929081` FOREIGN KEY (`agreement_id`) REFERENCES `agresso_contracts` (`agreement_id`)
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_roles` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `user_role_id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`user_role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_settings`
--

DROP TABLE IF EXISTS `user_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_settings` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `parent_component` varchar(50) NOT NULL,
  `component` varchar(50) NOT NULL,
  `especific_component` varchar(50) NOT NULL,
  `value` text,
  PRIMARY KEY (`id`),
  KEY `FK_4e4402a1f6153154bef178b3ae1` (`parent_component`),
  KEY `FK_a72092ddb246042f595ccbf3657` (`component`),
  KEY `FK_b8f1673b5c26ebfbe35ad96645e` (`especific_component`),
  CONSTRAINT `FK_4e4402a1f6153154bef178b3ae1` FOREIGN KEY (`parent_component`) REFERENCES `setting_keys` (`key`),
  CONSTRAINT `FK_a72092ddb246042f595ccbf3657` FOREIGN KEY (`component`) REFERENCES `setting_keys` (`key`),
  CONSTRAINT `FK_b8f1673b5c26ebfbe35ad96645e` FOREIGN KEY (`especific_component`) REFERENCES `setting_keys` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_status`
--

DROP TABLE IF EXISTS `user_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_status` (
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` bigint DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `user_status_id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`user_status_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `vw_results_dashboard_cap_sharing`
--

DROP TABLE IF EXISTS `vw_results_dashboard_cap_sharing`;
/*!50001 DROP VIEW IF EXISTS `vw_results_dashboard_cap_sharing`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_results_dashboard_cap_sharing` AS SELECT 
 1 AS `result_id`,
 1 AS `result_official_code`,
 1 AS `session_participants_male`,
 1 AS `session_participants_female`,
 1 AS `session_participants_non_binary`,
 1 AS `delivery_metod_id`,
 1 AS `delivery_metod`,
 1 AS `term_id`,
 1 AS `term`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_results_dashboard_countries`
--

DROP TABLE IF EXISTS `vw_results_dashboard_countries`;
/*!50001 DROP VIEW IF EXISTS `vw_results_dashboard_countries`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_results_dashboard_countries` AS SELECT 
 1 AS `result_id`,
 1 AS `result_official_code`,
 1 AS `country_name`,
 1 AS `isoAlpha2`,
 1 AS `isoAlpha3`,
 1 AS `longitude`,
 1 AS `latitude`,
 1 AS `region_un_name`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_results_dashboard_policies`
--

DROP TABLE IF EXISTS `vw_results_dashboard_policies`;
/*!50001 DROP VIEW IF EXISTS `vw_results_dashboard_policies`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_results_dashboard_policies` AS SELECT 
 1 AS `result_id`,
 1 AS `result_official_code`,
 1 AS `policy_stage_id`,
 1 AS `policy_stage`,
 1 AS `policy_type_id`,
 1 AS `policy_type`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_results_dashboard_regions`
--

DROP TABLE IF EXISTS `vw_results_dashboard_regions`;
/*!50001 DROP VIEW IF EXISTS `vw_results_dashboard_regions`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_results_dashboard_regions` AS SELECT 
 1 AS `result_id`,
 1 AS `result_official_code`,
 1 AS `name`,
 1 AS `CGIAR_acronym`,
 1 AS `CGIAR_region`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_results_dashboard_results`
--

DROP TABLE IF EXISTS `vw_results_dashboard_results`;
/*!50001 DROP VIEW IF EXISTS `vw_results_dashboard_results`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_results_dashboard_results` AS SELECT 
 1 AS `result_id`,
 1 AS `result_official_code`,
 1 AS `title`,
 1 AS `report_year_id`,
 1 AS `Geographic_scope`,
 1 AS `result_type`,
 1 AS `pdf`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_results_dashboard_sdgs`
--

DROP TABLE IF EXISTS `vw_results_dashboard_sdgs`;
/*!50001 DROP VIEW IF EXISTS `vw_results_dashboard_sdgs`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_results_dashboard_sdgs` AS SELECT 
 1 AS `result_id`,
 1 AS `result_official_code`,
 1 AS `short_name`,
 1 AS `goal`,
 1 AS `target`*/;
SET character_set_client = @saved_cs_client;

--
-- Dumping routines for database 'alliancereportingdb'
--
/*!50003 DROP FUNCTION IF EXISTS `alignment_validation` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE FUNCTION `alignment_validation`(result_code BIGINT) RETURNS tinyint(1)
    READS SQL DATA
begin
                declare temp_contract boolean default true;
                declare temp_lever boolean default true;
                declare temp_lever_outcome boolean default true;
                declare count_lever int default null;
                declare result_indicator bigint default null;
				declare portfolio_id bigint default null;
    
                select 
                    r.indicator_id,
                    get_portfolio_id_by_result(r.result_id)
                    into
                    result_indicator,
                    portfolio_id
                from results r 
                where r.result_id = result_code;
                
                select 
                    if(count(rc.contract_id) > 0, true, false)
                    into
                    temp_contract
                from result_contracts rc 
                where rc.is_active = true 
                    and rc.is_primary = true 
                    and rc.contract_role_id = 1
                    and rc.result_id = result_code
                    and rc.contract_id is not null
                limit 1;
                
                select 
                    if(count(rl.lever_id) > 0, true, false),
                    count(rl.lever_id)
                    into 
                    temp_lever,
                    count_lever
                from result_levers rl 
                where rl.is_active = true 
                    and rl.is_primary = true 
                    and rl.lever_role_id = CASE 
	                    						WHEN portfolio_id = 1 THEN 1
	                    						WHEN portfolio_id = 2 THEN 3
	                    						ELSE NULL
	                    					END
                    and rl.result_id = result_code
                    and rl.lever_id is not null
                limit 1;
                
                if (portfolio_id = 1) then 
                
                	select 
	                    IF(COUNT(rl.result_id) > 0, COUNT(rl.lever_id ) = SUM(valid_text(rl.custom_lever_name)), TRUE) and temp_lever
	                    into 
	                    temp_lever
	                from result_levers rl 
	                where rl.is_active = true 
	                    and rl.lever_role_id = 1
	                    and rl.result_id = result_code
	                    and rl.lever_id = 9
	                limit 1;
                	
                	if result_indicator = 5 then
                
	                    SELECT 
	                        COUNT(DISTINCT rlst.result_lever_id ) = count_lever 
	                        INTO
	                        temp_lever_outcome
	                    FROM result_lever_sdg_targets rlst  
	                        INNER JOIN result_levers rl ON rl.result_lever_id = rlst.result_lever_id 
	                                                    AND rl.is_active = TRUE
	                                                    AND rl.is_primary = TRUE
	                    WHERE rl.result_id = result_code
	                        AND rlst.is_active = TRUE
	                    LIMIT 1;
	                
	                    SELECT 
	                        COUNT(DISTINCT rlso.result_lever_id) = count_lever AND temp_lever_outcome
	                        INTO
	                        temp_lever_outcome
	                    FROM result_lever_strategic_outcome rlso 
	                        INNER JOIN result_levers rl ON rl.result_lever_id = rlso.result_lever_id 
	                                                    AND rl.is_active = TRUE
	                                                    AND rl.is_primary = TRUE
	                    WHERE rl.result_id = result_code
	                        AND rlso.is_active = TRUE
	                    LIMIT 1;
	                
	                END IF;
                	
	            elseif (portfolio_id = 2) then
	            
	            	select
						if(count(rso.strategic_objective_id) > 0, true, false) and temp_lever
						into
						temp_lever
					from result_strategic_objectives rso 
					where rso.is_active 
						and rso.role_id = 1
						and rso.result_id = result_code;
	            	
	            	if result_indicator = 5 then
	            	
		            	select
							if(count(rio.impact_outcome_id ) > 0, true, false) and temp_lever
							into
							temp_lever
						from result_impact_outcomes rio 
						where rio.is_active 
							and rio.role_id = 1
							and rio.result_id = result_code;
		            	
	            	end if;
	           
                end if;
                

                if result_indicator <> 5 then
            
                    select
                        COUNT(rs.result_sdg_id) > 0 and temp_lever
                        into
                        temp_lever
                    from result_sdgs rs 
                    where rs.result_id = result_code
                        and rs.is_active = TRUE
                        and rs.clarisa_sdg_id is not null;
                
                end if;
                
                
                
                return temp_contract and temp_lever_outcome and temp_lever;
                
            end ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `cap_sharing_ip_validation` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE FUNCTION `cap_sharing_ip_validation`(result_code BIGINT) RETURNS tinyint(1)
    READS SQL DATA
BEGIN
	
	DECLARE validation BOOLEAN DEFAULT false;

	SELECT 
		IF(rcsi.asset_ip_owner_id = 4, count_words_and_validate(rcsi.asset_ip_owner_description, 1000), rcsi.asset_ip_owner_id IS NOT NULL )
		AND IF(rcsi.potential_asset = TRUE, valid_text(rcsi.potential_asset_description), TRUE)
		AND rcsi.publicity_restriction IS NOT NULL
		AND IF(rcsi.publicity_restriction = TRUE, valid_text(rcsi.publicity_restriction_description), TRUE)
		AND rcsi.requires_futher_development IS NOT NULL
		AND IF(rcsi.requires_futher_development = TRUE, valid_text(rcsi.requires_futher_development_description), TRUE)
		INTO
		validation
	FROM result_cap_sharing_ip rcsi
	WHERE rcsi.is_active = TRUE
		AND rcsi.result_cap_sharing_ip_id = result_code
	LIMIT 1;
	
	RETURN validation;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `cap_sharing_validation` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_520_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE FUNCTION `cap_sharing_validation`(result_code BIGINT) RETURNS tinyint(1)
    READS SQL DATA
BEGIN 
                            
                            DECLARE session_format BIGINT DEFAULT NULL;
                            DECLARE individual_validation BOOLEAN DEFAULT FALSE;
                            DECLARE group_validation BOOLEAN DEFAULT FALSE;
                            DECLARE common_data BOOLEAN DEFAULT FALSE;
                            DECLARE specific_individual_validation BOOLEAN DEFAULT FALSE;
                            DECLARE specific_group_validation BOOLEAN DEFAULT FALSE; 
                            DECLARE is_attending_organization BOOLEAN DEFAULT NULL;
                            
                            SELECT 
                                rcs.session_format_id,
                                (rcs.session_type_id IS NOT NULL
                                    AND rcs.gender_id IS NOT NULL
                                    AND valid_text(rcs.trainee_name)),
                                (rcs.session_purpose_id IS NOT NULL
                                    AND IFNULL(rcs.session_participants_total, 0) > 0
                                    AND rcs.is_attending_organization IS NOT NULL
                                    AND IF(rcs.session_purpose_id = 4, valid_text(rcs.session_purpose_description), TRUE)),
                                (rcs.session_format_id IS NOT NULL  
                                    AND rcs.delivery_modality_id IS NOT NULL
                                    AND rcs.session_length_id IS NOT NULL
                                    AND rcs.start_date IS NOT NULL
                                    AND rcs.end_date IS NOT NULL
                                    AND IF(rcs.session_length_id = 2, rcs.degree_id IS NOT NULL, TRUE)),
                                rcs.is_attending_organization
                                INTO
                                session_format,
                                individual_validation,
                                group_validation,
                                common_data,
                                is_attending_organization
                            FROM result_capacity_sharing rcs 
                            WHERE rcs.is_active = TRUE
                                AND rcs.result_id = result_code
                            LIMIT 1;
                            
                            SELECT 
                                COUNT(ru.user_id) = 1 AND common_data
                                INTO
                                common_data
                            FROM result_users ru 
                            WHERE ru.is_active = TRUE
                                AND ru.user_role_id = 2
                                AND ru.result_id = result_code
                            LIMIT 1;
                            
                            IF common_data = FALSE THEN
                            
                                RETURN FALSE;
                            
                            END IF;
                            
                            IF session_format = 1 THEN 
                                
                                RETURN TRUE;
                            
                            ELSEIF  session_format = 2 THEN
                            
                                SELECT 
                                    COUNT(ri.institution_id) > 0
                                    INTO 
                                    specific_group_validation
                                FROM result_institutions ri 
                                WHERE ri.is_active = TRUE
                                    AND ri.institution_role_id = 2
                                    AND ri.result_id = result_code;
                                
                                RETURN IF(is_attending_organization = TRUE, specific_group_validation, TRUE) AND group_validation;
                            
                            END IF;
                            
                            
                                
                            RETURN FALSE;
                            
                        END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `count_words_and_validate` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_520_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE FUNCTION `count_words_and_validate`(text TEXT, max_words INT) RETURNS tinyint(1)
    READS SQL DATA
    DETERMINISTIC
BEGIN
            DECLARE word_count INT;
        
            SET word_count = LENGTH(TRIM(text)) - LENGTH(REPLACE(TRIM(text), ' ', '')) + 1;
            
            IF text IS NULL OR TRIM(text) = '' THEN
                RETURN FALSE;
            END IF;
            
            IF word_count <= max_words THEN
                RETURN TRUE;
            ELSE
                RETURN FALSE;
            END IF;
        END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `delete_result` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_520_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE FUNCTION `delete_result`(result_code BIGINT) RETURNS tinyint(1)
    DETERMINISTIC
BEGIN
            DECLARE resultId BIGINT DEFAULT NULL;
            DECLARE deleteDate TIMESTAMP DEFAULT NOW();
            
            SELECT 
                r.result_id 
                INTO
                resultId
            FROM results r 
            WHERE r.is_active = TRUE
                AND r.result_id = result_code
            LIMIT 1;
            
            IF resultId IS NULL THEN 
                RETURN FALSE;
            END IF;
            
            UPDATE results r
            SET r.is_active = FALSE,
                r.deleted_at = deleteDate,
                r.result_status_id = 8
            WHERE r.result_id = resultId
                AND r.is_active = TRUE;
            
            UPDATE result_keywords rk
            SET rk.is_active = FALSE,
                rk.deleted_at = deleteDate
            WHERE rk.result_id = resultId
                AND rk.is_active = TRUE;

            UPDATE result_knowledge_products rkp
            SET rkp.is_active = FALSE,
                rkp.deleted_at = deleteDate
            WHERE rkp.result_id = resultId
                AND rkp.is_active = TRUE;

            UPDATE result_oicrs ro
            SET ro.is_active = FALSE,
                ro.deleted_at = deleteDate
            WHERE ro.result_id = resultId
                AND ro.is_active = TRUE;
            
            UPDATE result_notable_references rnr
            SET rnr.is_active = FALSE,
                rnr.deleted_at = deleteDate
            WHERE rnr.result_id = resultId
            	AND rnr.is_active = TRUE;
                        
            UPDATE result_quantifications rq
            SET rq.is_active = FALSE,
                rq.deleted_at = deleteDate
            WHERE rq.result_id = resultId
            	AND rq.is_active = TRUE;
                        
             UPDATE result_impact_area_global_target rimagt
             INNER JOIN result_impact_areas ria ON ria.id = rimagt.result_impact_area_id 
             SET rimagt.is_active = FALSE,
                rimagt.deleted_at = deleteDate
             WHERE ria.result_id = resultId
             	AND rimagt.is_active = TRUE;
                        
             UPDATE result_impact_areas ria
             SET ria.is_active = FALSE,
                ria.deleted_at = deleteDate
             WHERE ria.result_id = resultId
             	AND ria.is_active = TRUE;
            
            UPDATE result_innovation_tool_function ritf
            SET ritf.is_active = FALSE,
                ritf.deleted_at = deleteDate
            WHERE ritf.result_id = resultId
                AND ritf.is_active = TRUE;

            UPDATE result_institution_ai ria
            SET ria.is_active = FALSE,
                ria.deleted_at = deleteDate
            WHERE ria.result_id  = resultId
                AND ria.is_active = TRUE;
            
            UPDATE result_user_ai rua
            SET rua.is_active = FALSE,
                rua.deleted_at = deleteDate
            WHERE rua.result_id  = resultId
                AND rua.is_active = TRUE;
            
            UPDATE result_users ru 
            SET ru.is_active = FALSE,
                ru.deleted_at = deleteDate
            WHERE ru.result_id = resultId
                AND ru.is_active = TRUE;
            
            UPDATE result_contracts rc 
            SET rc.is_active = FALSE,
                rc.deleted_at =  deleteDate
            WHERE rc.result_id = resultId
                AND rc.is_active = TRUE;
            
            UPDATE result_levers rl 
            SET rl.is_active = FALSE,
                rl.deleted_at = deleteDate
            WHERE rl.result_id = resultId
                AND rl.is_active = TRUE;
            
            UPDATE result_institutions ri 
            SET ri.is_active = FALSE,
                ri.deleted_at = deleteDate
            WHERE ri.result_id = resultId
                AND ri.is_active = TRUE;
            
            UPDATE result_countries rc 
            INNER JOIN result_countries_sub_nationals rcsn ON rc.result_country_id = rcsn.result_country_id 
            SET rcsn.is_active = FALSE,
                rcsn.deleted_at = deleteDate
            WHERE rc.is_active = TRUE
                AND rc.result_id = resultId
                AND rcsn.is_active = TRUE;
            
            UPDATE result_countries rc 
            SET rc.is_active = FALSE,
                rc.deleted_at = deleteDate
            WHERE rc.result_id = resultId
                AND rc.is_active = TRUE;
            
            UPDATE result_regions rr 
            SET rr.is_active = FALSE,
                rr.deleted_at = deleteDate
            WHERE rr.result_id = resultId
                AND rr.is_active = TRUE;
            
            UPDATE result_evidences re 
            SET re.is_active = FALSE,
                re.deleted_at = deleteDate
            WHERE re.result_id = resultId
                AND re.is_active = TRUE;
            
            UPDATE link_results lr 
            SET lr.is_active = FALSE,
                lr.deleted_at = deleteDate
            WHERE lr.result_id = resultId
                AND lr.is_active = TRUE;
            
            UPDATE result_policy_change rpc 
            SET rpc.is_active = FALSE,
                rpc.deleted_at = deleteDate
            WHERE rpc.result_id = resultId
                AND rpc.is_active = TRUE;
            
            UPDATE result_capacity_sharing rcs 
            SET rcs.is_active = FALSE,
                rcs.deleted_at = deleteDate
            WHERE rcs.result_id = resultId
                AND rcs.is_active = TRUE;
            
            UPDATE result_innovation_dev rid 
            SET rid.is_active = FALSE, 
                rid.deleted_at = deleteDate
            WHERE rid.result_id = resultId
                AND rid.is_active = TRUE;
            
            UPDATE result_ip_rights rir  
            SET rir.is_active = FALSE, 
                rir.deleted_at = deleteDate
            WHERE rir.result_ip_rights_id = resultId
                AND rir.is_active = TRUE;

            UPDATE result_languages rl 
            SET  rl.is_active = FALSE, 
                rl.deleted_at = deleteDate
            WHERE rl.result_id = resultId
                AND rl.is_active = TRUE;

            UPDATE result_institution_types rit 
            SET rit.is_active = FALSE,
                rit.deleted_at = deleteDate
            WHERE rit.is_active = TRUE
                AND rit.result_id = resultId;

            UPDATE result_tags rt 
            SET rt.is_active = FALSE,
                rt.deleted_at = deleteDate
            WHERE rt.is_active = TRUE
                AND rt.result_id = resultId;

            UPDATE result_initiatives ri
            SET ri.is_active = FALSE,
                ri.deleted_at = deleteDate
            WHERE ri.is_active = TRUE
                AND ri.result_id = resultId;
            
            UPDATE result_actors ra 
            SET ra.is_active = FALSE,
                ra.deleted_at = deleteDate
            WHERE ra.is_active = TRUE
                AND ra.result_id = resultId;
            
            RETURN TRUE;
            
        END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `evidences_validation` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_520_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE FUNCTION `evidences_validation`(result_code BIGINT) RETURNS tinyint(1)
    READS SQL DATA
begin 
            
            declare temp_count_url int default 0;
            declare temp_count_description int default 0;
            declare temp_count_evidences int default 0;
            declare reurn_validation boolean default false;
            DECLARE current_indicator BIGINT DEFAULT NULL;

            select 
                count(re.result_evidence_id),
                sum(valid_text(re.evidence_url)),
                sum(valid_text(re.evidence_description))
                into
                temp_count_evidences,
                temp_count_url,
                temp_count_description
            from result_evidences re 
            where re.is_active = true
                and re.evidence_role_id = 1
                and re.result_id = result_code
            group by re.result_id;
            
            SELECT 
            	r.indicator_id 
            	INTO 
            	current_indicator
            FROM results r
            WHERE r.result_id = result_code
            	AND r.is_active = TRUE;
                
            set reurn_validation = if( temp_count_evidences > 0 and temp_count_url = temp_count_description, true, false );

            SELECT 
                IFNULL(COUNT(rnr.id) = SUM(valid_text(rnr.link) AND 
                                    rnr.notable_reference_type_id IS NOT NULL), TRUE) AND reurn_validation 
                INTO
                reurn_validation
            FROM result_notable_references rnr 
            WHERE rnr.is_active = TRUE
                AND rnr.result_id = result_code;
            
            IF current_indicator = 5 THEN
            
            	SELECT 
            		valid_text(ro.cgspace_link) AND reurn_validation
            		INTO
            		reurn_validation
            	FROM result_oicrs ro 
            	WHERE ro.result_id = result_code
            		AND ro.is_active = TRUE;
            	
            	
            END IF;
            
                
            return reurn_validation;
            
        end ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `full_delete_result_version` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_520_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE FUNCTION `full_delete_result_version`(resultCode BIGINT) RETURNS tinyint(1)
    READS SQL DATA
BEGIN
                        
                        DECLARE temp_result_id BIGINT;
                        
                        SELECT 
                        r.result_id
                            INTO
                        temp_result_id
                        FROM results r
                        WHERE  r.result_id  = resultCode;
                        
                        IF (temp_result_id IS NULL) THEN
                            RETURN FALSE;
                        END IF;

                        DELETE
                            FROM result_pool_funding_indicator_mapping
                            WHERE result_id = temp_result_id;

                        
                        DELETE
                            FROM result_oicrs 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_notable_references
                        	WHERE result_id = temp_result_id;

                        DELETE
                        	FROM result_knowledge_products 
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_quantifications
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_impact_area_global_target
                        	WHERE result_impact_area_global_target.result_impact_area_id IN(SELECT ria.id 
	                        	FROM result_impact_areas ria
	                        	WHERE ria.result_id = temp_result_id);
                        
                        DELETE
                        	FROM result_impact_areas
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM link_results
                            WHERE result_id = temp_result_id
                        		OR other_result_id = temp_result_id; 
                        

                        DELETE 
                            FROM result_innovation_tool_function
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_impact_outcomes
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_strategic_objectives
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_keywords 
                            WHERE result_id = temp_result_id;

                        DELETE 
                        	FROM result_institution_ai 
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_user_ai 
                        	WHERE result_id = temp_result_id;

                        DELETE 
                            FROM result_initiatives
                            WHERE result_id = temp_result_id;
                            
                        DELETE
                            FROM result_tags
                            WHERE result_id = temp_result_id;

                        DELETE 
                            FROM result_users 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_contracts 
                            WHERE result_id = temp_result_id;
                        
                        DELETE
                        FROM result_lever_sdg_targets
                            WHERE result_lever_sdg_targets.result_lever_id IN (SELECT rl.result_lever_id  
 													  FROM result_levers rl 
 													  WHERE rl.result_id = temp_result_id);
                        
                        DELETE
                        FROM result_lever_strategic_outcome
                            WHERE result_lever_strategic_outcome.result_lever_id IN (SELECT rl.result_lever_id  
 													  FROM result_levers rl 
 													  WHERE rl.result_id = temp_result_id);
                        
                        DELETE 
                            FROM result_levers 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_institutions 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_evidences 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_innovation_dev 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_actors 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_institution_types 
                            WHERE result_id = temp_result_id;
                        
                        DELETE
                            FROM result_ip_rights 
                            WHERE result_ip_rights_id = temp_result_id;
                        
                        DELETE 
                            FROM result_capacity_sharing 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_policy_change 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_regions 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_sdgs 
                            WHERE result_id = temp_result_id;
                        
                        DELETE
                            FROM result_countries_sub_nationals
                            WHERE result_countries_sub_nationals.result_country_id IN (SELECT rc.result_country_id 
                        FROM result_countries rc
                        WHERE rc.result_id = temp_result_id	);
                            
                        DELETE 
                            FROM result_countries
                            WHERE result_id = temp_result_id;
                            
                        DELETE 
                            FROM result_languages
                            WHERE result_id = temp_result_id;
                            
                        DELETE 
                            FROM submission_history
                            WHERE result_id = temp_result_id;
                            
                                                DELETE
                            FROM result_pool_funding_alignment_sp
                            WHERE alignment_id IN (SELECT rpfa.id
                        FROM result_pool_funding_alignment rpfa
                        WHERE rpfa.result_id = temp_result_id);

                        DELETE
                            FROM result_pool_funding_alignment
                            WHERE result_id = temp_result_id;

                        DELETE
                            FROM result_pool_funding_toc_alignment
                            WHERE result_id = temp_result_id;

                        DELETE
                            FROM result_review_history
                            WHERE result_id = temp_result_id;

                        DELETE
                            FROM bulk_upload_results
                            WHERE result_id = temp_result_id;

                        DELETE
                            FROM temp_result_ai
                            WHERE result_id = temp_result_id;

                        DELETE
                            FROM result_cap_sharing_ip
                            WHERE result_cap_sharing_ip_id = temp_result_id;

                        DELETE
                            FROM TEMP_result_external_oicrs
                            WHERE result_id = temp_result_id;

                        DELETE 
                            FROM results
                            WHERE result_id = temp_result_id;
                       
                        RETURN TRUE;

                        
                    END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `general_information_validation` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_520_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE FUNCTION `general_information_validation`(result_code BIGINT) RETURNS tinyint(1)
    READS SQL DATA
BEGIN
            
            DECLARE temp_title BOOLEAN DEFAULT FALSE;
            DECLARE temp_contact_person BOOLEAN DEFAULT FALSE; 
            DECLARE temp_description BOOLEAN DEFAULT FALSE;

            SELECT 
                valid_text(r.title),
                valid_text(r.description),
                IF(ru.user_id IS NOT NULL, TRUE, FALSE)
                INTO
                temp_title,
                temp_description,
                temp_contact_person
            FROM results r 
            LEFT JOIN result_users ru ON ru.result_id = r.result_id
                                        AND ru.is_active = 1
                                        AND ru.user_role_id = 1
            WHERE r.result_id = result_code
                AND r.is_active = TRUE
                AND r.indicator_id IS NOT NULL
            LIMIT 1;
            
            RETURN temp_title AND temp_contact_person AND temp_description;
        
        END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `geo_location_validation` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_520_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE FUNCTION `geo_location_validation`(result_code BIGINT) RETURNS tinyint(1)
    READS SQL DATA
begin
            declare reurn_validation boolean default false;
            declare temp_geo_scope_id int default 0;
            declare count_country int default 0;
            declare count_subnationals int default 0;
            declare ids_list text default '';
            select 
                r.geo_scope_id 
                into
                temp_geo_scope_id
            from results r
            where r.is_active = true
                and r.result_id = result_code
            limit 1;
            
            if temp_geo_scope_id in (1, 50) then
            
                return true;
                
            end if;
            if temp_geo_scope_id = 2 then
            
                select 
                    if(count(rr.region_id) > 0, true, false)
                    into
                    reurn_validation
                from result_regions rr 
                where rr.is_active = true
                    and rr.result_id = result_code
                    and rr.result_region_id is not null;
                    
                return reurn_validation;
            
            end if;
            if temp_geo_scope_id in (3, 4, 5) then
            
                select 
                    count(rc.isoAlpha2),
                    group_concat(rc.result_country_id separator ',') 
                    into
                    count_country,
                    ids_list
                from result_countries rc
                where rc.is_active = true   
                    and rc.country_role_id = 2
                    and rc.result_id = result_code
                    and rc.isoAlpha2 is not null;
                
                set reurn_validation = if (count_country > 0, true, false);
                    
            end if;
            if temp_geo_scope_id = 5 then
                
                select 
                    sum(temp_sn.valid)
                    into
                    count_subnationals
                from (select 
                    if(count(rcsn.sub_national_id) > 0, 1, 0) as valid
                    from result_countries_sub_nationals rcsn 
                    where find_in_set(rcsn.result_country_id, ids_list)
                        and rcsn.is_active = true
                        and rcsn.sub_national_id is not null
                    group by rcsn.result_country_id) temp_sn;
                
                set reurn_validation = if (count_country > 0 and count_subnationals = count_country, true, false);
                
            end if;
            
            return reurn_validation;
            
        end ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `get_portfolio_id_by_result` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_520_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE FUNCTION `get_portfolio_id_by_result`(p_result_id BIGINT) RETURNS bigint
    READS SQL DATA
    DETERMINISTIC
BEGIN
        DECLARE v_report_year INT DEFAULT NULL;
        DECLARE v_portfolio_id BIGINT DEFAULT NULL;
        SELECT r.report_year_id
        INTO v_report_year
        FROM results r
        WHERE r.result_id = p_result_id
        LIMIT 1;
        IF v_report_year IS NULL THEN
            RETURN NULL;
        END IF;
        SELECT p.id
        INTO v_portfolio_id
        FROM portfolios p
        WHERE p.is_active = 1
        AND p.start_year <= v_report_year
        AND p.end_year >= v_report_year
        ORDER BY p.id
        LIMIT 1;
        RETURN v_portfolio_id;
    END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `innovation_dev_validation` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_520_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE FUNCTION `innovation_dev_validation`(result_code BIGINT) RETURNS tinyint(1)
    READS SQL DATA
BEGIN
            DECLARE commonFields BOOLEAN DEFAULT FALSE;
            DECLARE anticipatedUserId BIGINT DEFAULT NULL;
            DECLARE tempSecondFields BOOLEAN DEFAULT FALSE;
            DECLARE tempActors INT DEFAULT NULL;
            DECLARE tempFullActors INT DEFAULT NULL;
            DECLARE tempInstitutionType INT DEFAULT NULL;
            DECLARE tempFullInstitutionType INT DEFAULT NULL;
            DECLARE knowledgeSharing BOOLEAN DEFAULT FALSE;
            DECLARE readinessLevel BIGINT DEFAULT NULL;

            SELECT 
                (valid_text(rid.short_title) AND
                rid.innovation_nature_id IS NOT NULL AND
                rid.innovation_type_id IS NOT NULL AND
                rid.innovation_readiness_id IS NOT NULL AND
                valid_text(rid.innovation_readiness_explanation) AND
                IF(rid.is_new_or_improved_variety = TRUE, rid.new_or_improved_varieties_count > 0, TRUE) AND
                rid.anticipated_users_id IS NOT NULL),
                rid.anticipated_users_id,
                (valid_text(rid.expected_outcome) AND
                valid_text(rid.intended_beneficiaries_description)),
                IF(rid.is_knowledge_sharing = TRUE AND rid.is_knowledge_sharing IS NOT NULL, 
                    IF(rid.dissemination_qualification_id IS NOT NULL AND rid.dissemination_qualification_id = 2,
                        valid_text(rid.tool_useful_context) 
                        AND valid_text(rid.results_achieved_expected)
                        AND EXISTS (
                            SELECT 1 
                            FROM result_innovation_tool_function ritf
                            WHERE ritf.result_id = rid.result_id
                            AND ritf.is_active = TRUE
                        )
                        AND IF(rid.is_used_beyond_original_context = TRUE,
                            valid_text(rid.adoption_adaptation_context),
                            IF(rid.is_used_beyond_original_context IS NULL, FALSE, TRUE)
                        ),  
                        IF(rid.dissemination_qualification_id IS NULL, FALSE, TRUE)
                    ), 
                    IF(rid.is_knowledge_sharing IS NULL, FALSE, TRUE)
                ),
                cirl.level
            INTO
                commonFields,
                anticipatedUserId,
                tempSecondFields,
                knowledgeSharing,
                readinessLevel
            FROM results r 
            INNER JOIN result_innovation_dev rid ON r.result_id = rid.result_id 
            LEFT JOIN clarisa_innovation_readiness_levels cirl ON cirl.id = rid.innovation_readiness_id
            WHERE r.result_id = result_code
            AND r.is_active = TRUE
            LIMIT 1;
            
            SELECT COUNT(ra.result_actors_id)
            INTO tempFullActors
            FROM result_actors ra 
            WHERE ra.result_id = result_code
            AND ra.is_active = TRUE;
            
            SELECT IFNULL(
                    SUM(
                        CASE
                            WHEN ra.actor_type_id = 5 THEN ra.actor_type_custom_name IS NOT NULL
                            ELSE ra.actor_type_id IS NOT NULL
                        END
                    ), FALSE)
            INTO tempActors
            FROM result_actors ra 
            WHERE ra.result_id = result_code
            AND ra.is_active = TRUE;
            
            SELECT IFNULL(SUM(CASE 
                WHEN rit.is_organization_known = TRUE THEN rit.institution_id IS NOT NULL
                ELSE (CASE
                    WHEN rit.institution_type_id = 78 THEN rit.institution_type_custom_name IS NOT NULL
                    WHEN (rit.institution_type_id != 78 AND rit.institution_type_id IS NOT NULL) THEN CASE 
                        WHEN (SELECT COUNT(cit.code) FROM clarisa_institution_types cit WHERE cit.parent_code = rit.institution_type_id) > 0 THEN rit.sub_institution_type_id IS NOT NULL
                        ELSE rit.institution_type_id IS NOT NULL
                        END
                    ELSE FALSE
                    END)
                END), FALSE)
            INTO tempInstitutionType
            FROM result_institution_types rit 
            WHERE rit.result_id = result_code
            AND rit.is_active = TRUE;
            
            SELECT count(rit.result_institution_type_id)
            INTO tempFullInstitutionType
            FROM result_institution_types rit 
            WHERE rit.result_id = result_code
            AND rit.is_active = TRUE;
            
            RETURN IF(anticipatedUserId = 1 OR anticipatedUserId IS NULL, TRUE, (tempInstitutionType = tempFullInstitutionType) AND 
                (tempInstitutionType > 0) AND
                (tempFullActors = tempActors) AND 
                (tempActors > 0) AND
                tempSecondFields)
                AND commonFields  
                AND IF(readinessLevel >= 7, knowledgeSharing, TRUE);
        END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `intellectual_property_validation` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_520_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE FUNCTION `intellectual_property_validation`(result_code BIGINT) RETURNS tinyint(1)
    READS SQL DATA
BEGIN
            
            DECLARE validation BOOLEAN DEFAULT false;
            DECLARE validationInnoDev BOOLEAN DEFAULT false;
            DECLARE indicatorId BIGINT DEFAULT NULL;

            SELECT 
                IF(rir.asset_ip_owner_id = 4, count_words_and_validate(rir.asset_ip_owner_description, 1000), rir.asset_ip_owner_id IS NOT NULL )
                AND IF(rir.potential_asset = TRUE, valid_text(rir.potential_asset_description), TRUE)
                AND rir.publicity_restriction IS NOT NULL
                AND IF(rir.publicity_restriction = TRUE, valid_text(rir.publicity_restriction_description), TRUE)
                AND rir.requires_futher_development IS NOT NULL
                AND IF(rir.requires_futher_development = TRUE, valid_text(rir.requires_futher_development_description), TRUE),
                (rir.formal_ip_rights_application_id IS NOT NULL
                AND rir.private_sector_engagement_id IS NOT NULL),
                r.indicator_id 
                INTO
                validation,
                validationInnoDev,
                indicatorId
            FROM result_ip_rights rir
            INNER JOIN results r ON r.result_id = rir.result_ip_rights_id 
            WHERE rir.is_active = TRUE
                AND rir.result_ip_rights_id = result_code
            LIMIT 1;
            
            IF indicatorId = 2 THEN 
                RETURN validation AND validationInnoDev;
            END IF;
            
            RETURN validation;

        END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `link_result_validation` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_520_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE FUNCTION `link_result_validation`(result_code BIGINT) RETURNS tinyint(1)
    READS SQL DATA
begin
            declare reurn_validation boolean default false;
            
			SELECT 
				COALESCE(COUNT(lr.link_result_id) = SUM(lr.other_result_id IS NOT NULL), TRUE)
				INTO
				reurn_validation
			FROM link_results lr 
			WHERE lr.result_id = result_code
				AND lr.is_active = TRUE
				AND lr.link_result_role_id = 4;            

            RETURN reurn_validation;
            
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `oicr_validation` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_520_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE FUNCTION `oicr_validation`(result_code BIGINT) RETURNS tinyint(1)
    READS SQL DATA
BEGIN
                                    DECLARE general_validation BOOLEAN DEFAULT FALSE;
                                    
                                    SELECT 
                                        valid_text(ro.oicr_internal_code) AND
                                        ro.maturity_level_id IS NOT NULL AND
                                        valid_text(ro.outcome_impact_statement) AND
                                        valid_text(ro.short_outcome_impact_statement)
                                        INTO
                                        general_validation
                                    FROM result_oicrs ro 
                                    WHERE ro.result_id = result_code;
                                    
                                    
                                    SELECT 
                                        COUNT(rt.id) > 0 AND general_validation
                                        INTO
                                        general_validation
                                    FROM result_tags rt 
                                    WHERE rt.is_active = TRUE
                                        AND rt.result_id = result_code;
                                                                                   
                                    
                                    SELECT 
                                        COUNT( treo.id > 0) AND general_validation
                                        INTO
                                        general_validation
                                    FROM TEMP_result_external_oicrs treo 
                                    WHERE treo.result_id = result_code
                                        AND treo.is_active = TRUE;
                                    
                                    
                                    SELECT 
                                        IFNULL(COUNT(rq.id) = SUM(valid_text(rq.unit) AND 
                                                            rq.quantification_number IS NOT NULL AND 
                                                            valid_text(rq.description)), TRUE) AND general_validation
                                        INTO
                                        general_validation
                                    FROM result_quantifications rq 
                                    WHERE rq.result_id = result_code
                                        AND rq.is_active = TRUE
                                        AND rq.quantification_role_id = 1;
                                    
                                    SELECT 
                                        IFNULL(COUNT(rq.id) = SUM(valid_text(rq.unit) AND 
                                                            rq.quantification_number IS NOT NULL AND 
                                                            valid_text(rq.description)), TRUE) AND general_validation
                                        INTO
                                        general_validation
                                    FROM result_quantifications rq 
                                    WHERE rq.result_id = result_code
                                        AND rq.is_active = TRUE
                                        AND rq.quantification_role_id = 2;
                                    
                                    SELECT 
                                    	COUNT(cia.id) = SUM(ria.impact_area_score_id IS NOT NULL) AND general_validation
                                    	INTO
                                    	general_validation
                                    FROM clarisa_impact_areas cia 	
                                    	LEFT JOIN result_impact_areas ria ON ria.impact_area_id = cia.id 
                                    									AND ria.is_active = TRUE
                                    									AND ria.result_id = result_code;
                                    
                                    
                                    SELECT 
                                        count(temp.id) = COALESCE(COUNT(temp.valid), FALSE) AND general_validation
                                        INTO
                                        general_validation
                                    FROM (SELECT ria.id, SUM(riagt.id > 0) > 0 AS valid
                                    FROM result_impact_areas ria
                                    LEFT JOIN result_impact_area_global_target riagt ON riagt.result_impact_area_id = ria.id
                                                                                    AND riagt.is_active = TRUE
                                    WHERE ria.result_id = result_code
                                        AND ria.impact_area_score_id = 3
                                    GROUP BY ria.id) temp;
                                    
                                        
                                    RETURN general_validation;     
                                END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `partners_validation` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_520_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE FUNCTION `partners_validation`(result_code BIGINT) RETURNS tinyint(1)
    READS SQL DATA
begin
            declare temp_institution boolean default null;
			declare temp_section_active boolean default null;

			select 
				r.is_partner_not_applicable
				into
				temp_section_active
			from results r 
			where r.is_active = true
				and r.result_id = result_code;
			
			if temp_section_active = true then
				return true;
			end if;

            select 
                if(count(ri.institution_id) > 0, true, false) 
                into
                temp_institution
            from result_institutions ri 
            where ri.is_active = true 
                and ri.institution_role_id = 3
                and ri.institution_id is not null
                and ri.result_id = result_code
            limit 1;

            return temp_institution;
            
        end ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `policy_change_validation` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_520_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE FUNCTION `policy_change_validation`(result_code BIGINT) RETURNS tinyint(1)
    READS SQL DATA
begin
            DECLARE validation BOOLEAN DEFAULT FALSE;

            SELECT 
                (rpc.policy_type_id IS NOT NULL
                    AND rpc.policy_stage_id IS NOT NULL
                    AND valid_text(rpc.evidence_stage))
                INTO
                validation
            FROM result_policy_change rpc 
            WHERE rpc.is_active = TRUE
                AND rpc.result_id = result_code;
            
            SELECT 
                (COUNT(ri.institution_id) > 0 AND validation)
                INTO
                validation
            FROM result_institutions ri 
            WHERE ri.institution_role_id = 4
                AND ri.is_active = TRUE
                AND ri.result_id = result_code;
            
            RETURN validation;
            
        end ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `pool_funding_alignment_validation` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_520_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE FUNCTION `pool_funding_alignment_validation`(result_code BIGINT) RETURNS tinyint(1)
    READS SQL DATA
begin
            declare temp_eligible boolean default false;
            declare temp_has_contribution boolean default null;
            declare temp_has_primary boolean default false;
            declare count_sps int default 0;
            declare count_incomplete_sps int default 0;

            -- Eligibility: the result's primary contract is an EFFECTIVE
            -- pool-funding contributor (manual tag OR active bilateral
            -- mapping — same predicate as effectivePoolFundingContributorSql
            -- in shared/utils/pool-funding.util.ts).
            select
                if(count(ac.agreement_id) > 0, true, false)
                into temp_eligible
            from result_contracts rc
                inner join agresso_contracts ac on ac.agreement_id = rc.contract_id
                    and ac.is_active = true
            where rc.result_id = result_code
                and rc.is_active = true
                and rc.is_primary = true
                and (
                    coalesce(ac.is_pool_funding_contributor, 0) = 1
                    or exists (
                        select 1 from bilateral_project_mapping bpm
                        where bpm.agresso_agreement_id = ac.agreement_id
                            and bpm.is_active = 1
                    )
                );

            -- Optional section: not eligible means nothing to fill in.
            if temp_eligible = false then
                return true;
            end if;

            select pfa.has_contribution
                into temp_has_contribution
            from result_pool_funding_alignment pfa
            where pfa.result_id = result_code
                and pfa.is_active = true
            limit 1;

            -- Top-level question unanswered.
            if temp_has_contribution is null then
                return false;
            end if;

            -- Answered "No": nothing else applies.
            if temp_has_contribution = false then
                return true;
            end if;

            -- [SPEC bilateral/primary-contributing-sp] R-BIL-128 AC.1.
            -- Whether this alignment designates a Primary SP at all. Legacy rows
            -- predate sp_role and carry NULL on every row (T-02 does no
            -- backfill, R-BIL-126 AC.1), so this is false for them and the
            -- scope below falls back to the original all-SPs rule. Without
            -- that fallback every legacy alignment would score count_sps = 0
            -- and flip from green to red.
            select exists (
                select 1
                from result_pool_funding_alignment_sp sp
                    inner join result_pool_funding_alignment pfa on pfa.id = sp.alignment_id
                        and pfa.is_active = true
                where pfa.result_id = result_code
                    and sp.is_active = true
                    and sp.sp_role = 'PRIMARY'
            ) into temp_has_primary;

            -- Answered "Yes": ToC completeness is scoped to the SP the client
            -- actually renders a block for. Post-R-BIL-128 that is the Primary
            -- alone — a Contributing SP has no way to answer, so requiring one
            -- makes the check unreachable. This checks only that an ACTIVE ROW
            -- EXISTS (aligns_with_toc is not null) — it does NOT require
            -- level/toc_result_id/indicator_id to be populated, so a partial
            -- row (e.g. Level + High-Level Output only, no indicator) still
            -- satisfies it (unchanged from 1784500000000).
            --
            -- [SPEC bilateral/toc-optional-mapping] R-BIL-119 --
            -- pool_funding_alignment is a VISUAL_ONLY_GREEN_CHECKS entry
            -- (green-checks/dto/find-green-checks.dto.ts) and is excluded
            -- from the server-side completeness computations in
            -- green-checks.service.ts and
            -- result-status-workflow/function-handler.service.ts, so this
            -- function's return value does not gate the server's submit
            -- path. CAUTION: the value is still returned on the
            -- green-checks payload, and the STAR client currently gates
            -- its Submit control on that raw payload without filtering
            -- visual-only keys (client cache.service.ts,
            -- submission.service.ts), so a false here does surface as a
            -- disabled Submit button in the UI today.
            select
                count(sp.id),
                coalesce(sum(if(exists (
                    select 1 from result_pool_funding_toc_alignment toc
                    where toc.result_id = result_code
                        and toc.sp_code = sp.sp_code
                        and toc.is_active = true
                        and toc.aligns_with_toc is not null
                ), 0, 1)), 0)
                into count_sps, count_incomplete_sps
            from result_pool_funding_alignment_sp sp
                inner join result_pool_funding_alignment pfa on pfa.id = sp.alignment_id
                    and pfa.is_active = true
            where pfa.result_id = result_code
                and sp.is_active = true
                and (temp_has_primary = false or sp.sp_role = 'PRIMARY');

            return count_sps > 0 and count_incomplete_sps = 0;

        end ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `report_field` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_520_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE FUNCTION `report_field`(
        data_field MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        mandatory BOOLEAN,
        applies BOOLEAN
      ) RETURNS mediumtext CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci
BEGIN
        DECLARE has_content BOOLEAN DEFAULT FALSE;
        SET has_content = IFNULL(valid_text(data_field), FALSE);
        IF NOT COALESCE(applies, TRUE) THEN
          RETURN 'Not applicable';
        END IF;
        IF COALESCE(mandatory, FALSE) AND NOT has_content THEN
          RETURN 'Not provided';
        END IF;
        IF NOT COALESCE(mandatory, FALSE) AND NOT has_content THEN
          RETURN 'Not mandatory';
        END IF;
        RETURN data_field;
      END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `valid_text` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_520_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE FUNCTION `valid_text`(
        text MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      ) RETURNS tinyint(1)
    READS SQL DATA
    DETERMINISTIC
BEGIN
        RETURN IF(
          text IS NOT NULL,
          LENGTH(TRIM(REGEXP_REPLACE(text, '\\s+', ''))) > 0,
          FALSE
        );
      END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `delete_results_by_indicator_with_transactions` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `delete_results_by_indicator_with_transactions`(IN p_indicator_id INT)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_result_id BIGINT;
    DECLARE v_function_result BOOLEAN DEFAULT FALSE;
    DECLARE v_error_count INT DEFAULT 0;
    DECLARE v_success_count INT DEFAULT 0;
    DECLARE v_total_count INT DEFAULT 0;
    
    DECLARE result_cursor CURSOR FOR 
        SELECT r.result_id  
        FROM results r
        WHERE r.indicator_id = p_indicator_id;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Contar registros totales (sin mostrar)
    SELECT COUNT(*) INTO v_total_count
    FROM results r
    WHERE r.indicator_id = p_indicator_id;
    
    OPEN result_cursor;
    
    read_loop: LOOP
        FETCH result_cursor INTO v_result_id;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Transacción individual para cada result_id
        START TRANSACTION;
        
        BEGIN
            DECLARE EXIT HANDLER FOR SQLEXCEPTION
            BEGIN
                ROLLBACK;
                SET v_error_count = v_error_count + 1;
            END;
            
            -- Ejecutar la función de eliminación
            SET v_function_result = full_delete_result_version(v_result_id);
            
            -- Evaluar resultado de la función
            IF v_function_result = TRUE THEN
                COMMIT;
                SET v_success_count = v_success_count + 1;
            ELSE
                ROLLBACK;
                SET v_error_count = v_error_count + 1;
            END IF;
        END;
        
    END LOOP;
    
    CLOSE result_cursor;
    
    -- Solo mostrar resultados finales
    SELECT 
        p_indicator_id as indicator_id,
        v_total_count as total_records,
        v_success_count as successful_deletions,
        v_error_count as failed_deletions,
        CONCAT(ROUND((v_success_count / v_total_count) * 100, 2), '%') as success_rate,
        CASE 
            WHEN v_total_count = 0 THEN 'NO RECORDS FOUND'
            WHEN v_error_count = 0 THEN 'COMPLETED SUCCESSFULLY'
            WHEN v_success_count = 0 THEN 'ALL DELETIONS FAILED'
            ELSE 'COMPLETED WITH ERRORS'
        END as status,
        NOW() as completed_at;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `SP_delete_result_version` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `SP_delete_result_version`(IN resultCode BIGINT,IN reportYear INT)
BEGIN
                        
                        DECLARE temp_result_id BIGINT;
                        
                        SELECT 
                        r.result_id
                            INTO
                        temp_result_id
                        FROM results r
                        WHERE r.is_active = TRUE
                            AND r.is_snapshot = TRUE
                            AND r.report_year_id = reportYear
                            AND r.result_official_code = resultCode;
                        
                        IF (temp_result_id IS NULL) THEN
                            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Result not found - temp_result_id is NULL';
                        END IF;

                        DELETE
                            FROM result_oicrs 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_notable_references
                        	WHERE result_id = temp_result_id;

                        DELETE
                        	FROM result_knowledge_products 
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_quantifications
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_impact_area_global_target
                        	WHERE result_impact_area_global_target.result_impact_area_id IN(SELECT ria.id 
	                        	FROM result_impact_areas ria
	                        	WHERE ria.result_id = temp_result_id);
                        
                        DELETE
                        	FROM result_impact_areas
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM link_results
                            WHERE result_id = temp_result_id
                        		OR other_result_id = temp_result_id; 

                        DELETE 
                            FROM result_innovation_tool_function
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_keywords 
                            WHERE result_id = temp_result_id;

                        DELETE 
                        	FROM result_institution_ai 
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_user_ai 
                        	WHERE result_id = temp_result_id;

                        DELETE 
                            FROM result_initiatives
                            WHERE result_id = temp_result_id;
                            
                        DELETE
                            FROM result_tags
                            WHERE result_id = temp_result_id;

                        DELETE 
                            FROM result_users 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_contracts 
                            WHERE result_id = temp_result_id;
                        
                        DELETE
                        FROM result_lever_sdg_targets
                            WHERE result_lever_sdg_targets.result_lever_id IN (SELECT rl.result_lever_id  
 													  FROM result_levers rl 
 													  WHERE rl.result_id = temp_result_id);
                        
                        DELETE
                        FROM result_lever_strategic_outcome
                            WHERE result_lever_strategic_outcome.result_lever_id IN (SELECT rl.result_lever_id  
 													  FROM result_levers rl 
 													  WHERE rl.result_id = temp_result_id);
                        
                        DELETE 
                            FROM result_levers 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_institutions 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_evidences 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_innovation_dev 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_actors 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_institution_types 
                            WHERE result_id = temp_result_id;
                        
                        DELETE
                            FROM result_ip_rights 
                            WHERE result_ip_rights_id = temp_result_id;
                        
                        DELETE 
                            FROM result_capacity_sharing 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_policy_change 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_regions 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_sdgs 
                            WHERE result_id = temp_result_id;
                        
                        DELETE
                            FROM result_countries_sub_nationals
                            WHERE result_countries_sub_nationals.result_country_id IN (SELECT rc.result_country_id 
                        FROM result_countries rc
                        WHERE rc.result_id = temp_result_id	);
                            
                        DELETE 
                            FROM result_countries
                            WHERE result_id = temp_result_id;
                            
                        DELETE 
                            FROM result_languages
                            WHERE result_id = temp_result_id;
                            
                        DELETE 
                            FROM submission_history
                            WHERE result_id = temp_result_id;
                            
                        DELETE 
                            FROM results
                            WHERE result_id = temp_result_id;

                        
                    END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `SP_full_delete_results_by_platform` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `SP_full_delete_results_by_platform`(
    IN p_platform_code VARCHAR(50)
)
BEGIN
    DECLARE v_done INT DEFAULT FALSE;
    DECLARE v_result_id BIGINT;

    DECLARE cur CURSOR FOR
        SELECT t.result_id
        FROM tmp_result_ids_to_delete t
        ORDER BY t.result_id;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;

    DROP TEMPORARY TABLE IF EXISTS tmp_result_ids_to_delete;
    CREATE TEMPORARY TABLE tmp_result_ids_to_delete (
        result_id BIGINT NOT NULL PRIMARY KEY
    ) ENGINE=InnoDB;

    INSERT INTO tmp_result_ids_to_delete (result_id)
    SELECT r.result_id
    FROM results r
    WHERE r.platform_code = p_platform_code;

    OPEN cur;

    read_loop: LOOP
        FETCH cur INTO v_result_id;
        IF v_done THEN
            LEAVE read_loop;
        END IF;

        SELECT full_delete_result_version(v_result_id) INTO @__full_delete_ok;
    END LOOP read_loop;

    CLOSE cur;
    DROP TEMPORARY TABLE IF EXISTS tmp_result_ids_to_delete;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `SP_versioning` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_520_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `SP_versioning`(IN resultCode BIGINT)
BEGIN
                                    DECLARE temp_result_id BIGINT;
                                    DECLARE new_result_id BIGINT;
                                    DECLARE report_year INT;
                                    DECLARE exists_result BOOLEAN DEFAULT FALSE;
                                    
                                    SELECT 
                                    r.result_id,
                                    r.report_year_id 
                                        INTO
                                    temp_result_id,
                                    report_year
                                    FROM results r
                                    WHERE r.is_active = TRUE
                                        AND r.is_snapshot = FALSE
                                        AND r.result_official_code = resultCode
                                        AND r.platform_code = 'STAR';
                                    
                                    IF (temp_result_id IS NULL) THEN
                                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Result not found - temp_result_id is NULL';
                                    END IF;
                                    
                                    SELECT 
                                        if(r.result_id IS NOT NULL, TRUE, FALSE)
                                        INTO
                                        exists_result
                                    FROM results r 
                                    WHERE r.result_official_code = resultCode 
                                        AND r.is_snapshot = true
                                        AND r.is_active = true
                                        AND r.report_year_id = report_year;
                                    
                                    IF (exists_result = TRUE) THEN
                                        SIGNAL SQLSTATE '45001' SET MESSAGE_TEXT = 'Duplicate entry: temp_result_id already exists';
                                    END IF;
                                    
                                    INSERT
                                        INTO
                                        results (created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        result_official_code,
                                        version_id,
                                        title,
                                        description,
                                        indicator_id,
                                        geo_scope_id,
                                        result_status_id,
                                        deleted_at,
                                        report_year_id,
                                        tip_id,
                                        is_snapshot,
                                        is_ai,
                                        platform_code,
                                        comment_geo_scope)
                                    SELECT
                                        r.created_at,
                                        r.created_by,
                                        r.updated_at,
                                        r.updated_by,
                                        r.is_active,
                                        r.result_official_code,
                                        r.version_id,
                                        r.title,
                                        r.description,
                                        r.indicator_id,
                                        r.geo_scope_id,
                                        r.result_status_id,
                                        r.deleted_at,
                                        r.report_year_id,
                                        r.tip_id,
                                        TRUE AS is_snapshot,
                                        r.is_ai,
                                        r.platform_code,
                                        r.comment_geo_scope
                                    FROM
                                        results r
                                    WHERE
                                        r.result_id = temp_result_id;
                                    
                                    SET new_result_id = last_insert_id();
                                    
                                    INSERT 
                                        INTO
                                        result_keywords(
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        result_id,
                                        keyword,
                                        deleted_at)
                                    SELECT rk.created_at,
                                        rk.created_by,
                                        rk.updated_at,
                                        rk.updated_by,
                                        rk.is_active,
                                        new_result_id as result_id,
                                        rk.keyword,
                                        rk.deleted_at
                                    FROM result_keywords rk 
                                    WHERE rk.is_active = TRUE
                                        AND rk.result_id = temp_result_id;
                                    
                                    INSERT INTO result_impact_outcomes(
										created_at,
										created_by,
										updated_at,
										updated_by,
										is_active,
										deleted_at,
										id,
										result_id,
										impact_outcome_id,
										roles_id,
										role_id)
									SELECT 
										rio.created_at,
										rio.created_by,
										rio.updated_at,
										rio.updated_by,
										rio.is_active,
										rio.deleted_at,
										rio.id,
										new_result_id as result_id,
										rio.impact_outcome_id,
										rio.role_id
									FROM result_impact_outcomes rio 
									WHERE rio.is_active = TRUE
										AND rio.result_id = temp_result_id;
                                    
                                    INSERT INTO result_strategic_objectives(
										created_at,
										created_by,
										updated_at,
										updated_by,
										is_active,
										deleted_at,
										id,
										result_id,
										strategic_objective_id,
										roles_id,
										role_id)
									SELECT 
										rso.created_at,
										rso.created_by,
										rso.updated_at,
										rso.updated_by,
										rso.is_active,
										rso.deleted_at,
										rso.id,
										new_result_id as result_id,
										rso.strategic_objective_id,
										rso.role_id
									FROM result_strategic_objectives rso 
									WHERE rso.is_active = TRUE
										AND rso.result_id = temp_result_id;
                                    
                                    INSERT
                                        INTO
                                        result_oicrs(
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        deleted_at,
                                        result_id,
                                        outcome_impact_statement,
                                        general_comment,
                                        oicr_internal_code,
                                        short_outcome_impact_statement,
                                        maturity_level_id,
                                        elaboration_narrative,
                                        mel_regional_expert,
                                        sharepoint_link,
                                        mel_staff_group_id,
                                        for_external_use,
                                        for_external_use_description)
                                    SELECT 
                                        ro.created_at,
                                        ro.created_by,
                                        ro.updated_at,
                                        ro.updated_by,
                                        ro.is_active,
                                        ro.deleted_at,
                                        new_result_id AS result_id,
                                        ro.outcome_impact_statement,
                                        ro.general_comment,
                                        ro.oicr_internal_code,
                                        ro.short_outcome_impact_statement,
                                        ro.maturity_level_id,
                                        ro.elaboration_narrative,
                                        ro.mel_regional_expert,
                                        ro.sharepoint_link,
                                        ro.mel_staff_group_id,
                                        ro.for_external_use,
                                        ro.for_external_use_description
                                    FROM result_oicrs ro 
                                    WHERE ro.is_active = TRUE
                                        AND ro.result_id = temp_result_id;
                                    
                                    INSERT 
                                        INTO
                                        result_notable_references(
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        deleted_at,
                                        notable_reference_type_id,
                                        link,
                                        result_id)
                                    SELECT 
                                        rnr.created_at,
                                        rnr.created_by,
                                        rnr.updated_at,
                                        rnr.updated_by,
                                        rnr.is_active,
                                        rnr.deleted_at,
                                        rnr.notable_reference_type_id,
                                        rnr.link,
                                        new_result_id AS result_id
                                    FROM result_notable_references rnr 
                                    WHERE rnr.is_active = TRUE
                                        AND rnr.result_id = temp_result_id;
                                    
                                    INSERT
                                        INTO  
                                        result_impact_areas(
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        deleted_at,
                                        result_id,
                                        impact_area_id,
                                        impact_area_score_id)
                                    SELECT 
                                        ria.created_at,
                                        ria.created_by,
                                        ria.updated_at,
                                        ria.updated_by,
                                        ria.is_active,
                                        ria.deleted_at,
                                        new_result_id as result_id,
                                        ria.impact_area_id,
                                        ria.impact_area_score_id
                                    FROM result_impact_areas ria 
                                    WHERE ria.is_active = TRUE 
                                        AND ria.result_id = temp_result_id;
                                    
                                    INSERT
                                        INTO 
                                        result_impact_area_global_target(
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        deleted_at,
                                        result_impact_area_id,
                                        global_target_id)
                                    SELECT 
                                        riagt.created_at,
                                        riagt.created_by,
                                        riagt.updated_at,
                                        riagt.updated_by,
                                        riagt.is_active,
                                        riagt.deleted_at,
                                        temp.id AS result_impact_area_id,
                                        riagt.global_target_id
                                    FROM result_impact_areas ria 
                                        INNER JOIN result_impact_area_global_target riagt ON ria.id = riagt.result_impact_area_id 
                                        INNER JOIN (SELECT ria2.id, ria2.result_id, ria2.impact_area_id 
                                                    FROM result_impact_areas ria2
                                                    INNER JOIN results r ON r.result_id = ria2.result_id 
                                                                        AND r.is_active = TRUE
                                                                        AND r.result_id = new_result_id) temp ON temp.impact_area_id = ria.impact_area_id
                                    WHERE ria.result_id = temp_result_id
                                        AND ria.is_active = TRUE
                                        AND riagt.is_active = TRUE;
                                    
                                    INSERT 
                                        INTO result_quantifications(
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        deleted_at,
                                        quantification_number,
                                        unit,
                                        description,
                                        result_id,
                                        quantification_role_id
                                        )
                                    SELECT 
                                        rq.created_at,
                                        rq.created_by,
                                        rq.updated_at,
                                        rq.updated_by,
                                        rq.is_active,
                                        rq.deleted_at,
                                        rq.quantification_number,
                                        rq.unit,
                                        rq.description,
                                        new_result_id as result_id,
                                        rq.quantification_role_id
                                    FROM result_quantifications rq
                                    WHERE rq.is_active = TRUE
                                        AND rq.result_id  = temp_result_id;
                                    
                                    
                                    INSERT
                                        INTO
                                            result_users(
                                            created_at,
                                            created_by,
                                            updated_at,
                                            updated_by,
                                            is_active,
                                            result_id,
                                            user_role_id,
                                            user_id,
                                            deleted_at)
                                        SELECT 
                                            ru.created_at,
                                            ru.created_by,
                                            ru.updated_at,
                                            ru.updated_by,
                                            ru.is_active,
                                            new_result_id as result_id,
                                            ru.user_role_id,
                                            ru.user_id,
                                            ru.deleted_at
                                        FROM result_users ru 
                                        WHERE ru.is_active = TRUE
                                            AND ru.result_id = temp_result_id;
                                    
                                    INSERT INTO result_contracts (
                                            created_at,
                                            created_by,
                                            updated_at,
                                            updated_by,
                                            is_active,
                                            result_id,
                                            contract_role_id,
                                            contract_id,
                                            is_primary,
                                            deleted_at
                                        )
                                        SELECT
                                            rc.created_at,
                                            rc.created_by,
                                            rc.updated_at,
                                            rc.updated_by,
                                            rc.is_active,
                                            new_result_id as result_id,
                                            rc.contract_role_id,
                                            rc.contract_id,
                                            rc.is_primary,
                                            rc.deleted_at
                                        FROM
                                            result_contracts rc
                                        WHERE rc.is_active = TRUE
                                            AND rc.result_id = temp_result_id;
                                    
                                    INSERT INTO result_levers (
                                            created_at,
                                            created_by,
                                            updated_at,
                                            updated_by,
                                            is_active,
                                            result_id,
                                            lever_role_id,
                                            lever_id,
                                            is_primary,
                                            deleted_at,
                                            custom_lever_name 
                                        )
                                        SELECT
                                            rl.created_at,
                                            rl.created_by,
                                            rl.updated_at,
                                            rl.updated_by,
                                            rl.is_active,
                                            new_result_id as result_id,
                                            rl.lever_role_id,
                                            rl.lever_id,
                                            rl.is_primary,
                                            rl.deleted_at,
                                            rl.custom_lever_name
                                        FROM
                                            result_levers AS rl
                                        WHERE rl.is_active = TRUE
                                            AND rl.result_id = temp_result_id;
                                    
                                    INSERT INTO result_lever_sdg_targets(
                                    	created_at,
                                    	created_by,
                                    	deleted_at,
                                    	is_active,
                                    	result_lever_id,
                                    	updated_by,
                                    	updated_at,
                                    	sdg_target_id
                                    )
                                    SELECT 
                                    	rlst.created_at,
                                    	rlst.created_by,
                                    	rlst.deleted_at,
                                    	TRUE AS is_active,
                                    	temp.result_lever_id AS result_lever_id,
                                    	rlst.updated_by,
                                    	rlst.updated_at,
                                    	rlst.sdg_target_id
                                    FROM result_levers rl 
                                    INNER JOIN result_lever_sdg_targets rlst ON rl.result_lever_id = rlst.result_lever_id 
                                    	AND rlst.is_active = TRUE
                                    INNER JOIN (SELECT rl2.result_lever_id, rl2.lever_id, rl2.result_id 
                                    			FROM result_levers rl2
                                    			WHERE rl2.is_active = TRUE
                                    				AND rl2.result_id = new_result_id) temp ON temp.lever_id = rl.lever_id
                                    WHERE rl.is_active = TRUE
 										AND rl.result_id = temp_result_id;
                                    
                                    INSERT INTO result_lever_strategic_outcome(
                                    created_at,
                                    created_by,
                                    deleted_at,
                                    is_active,
                                    lever_strategic_outcome_id,
                                    result_lever_id,
                                    updated_by,
                                    updated_at
                                    )
                                     SELECT 
                                    	rlso.created_at,
                                    	rlso.created_by,
                                    	rlso.deleted_at,
                                    	TRUE AS is_active,
                                    	rlso.lever_strategic_outcome_id,
                                    	temp.result_lever_id AS result_lever_id,
                                    	rlso.updated_by,
                                    	rlso.updated_at
                                    FROM result_levers rl 
                                    INNER JOIN result_lever_strategic_outcome rlso ON rl.result_lever_id = rlso.result_lever_id 
                                    	AND rlso.is_active = TRUE
                                    INNER JOIN (SELECT rl2.result_lever_id, rl2.lever_id, rl2.result_id 
                                    			FROM result_levers rl2
                                    			WHERE rl2.is_active = TRUE
                                    				AND rl2.result_id = new_result_id) temp ON temp.lever_id = rl.lever_id
                                    WHERE rl.is_active = TRUE
 										AND rl.result_id = temp_result_id;
                                    
                                    INSERT INTO result_institutions (
                                            created_at,
                                            created_by,
                                            updated_at,
                                            updated_by,
                                            is_active,
                                            result_id,
                                            institution_id,
                                            institution_role_id,
                                            deleted_at
                                        )
                                        SELECT
                                            ri.created_at,
                                            ri.created_by,
                                            ri.updated_at,
                                            ri.updated_by,
                                            ri.is_active,
                                            new_result_id as result_id,
                                            ri.institution_id,
                                            ri.institution_role_id,
                                            ri.deleted_at
                                        FROM
                                            result_institutions AS ri
                                        WHERE ri.is_active = TRUE
                                            AND ri.result_id = temp_result_id;
                                    
                                        INSERT INTO result_evidences (
                                                created_at,
                                                created_by,
                                                updated_at,
                                                updated_by,
                                                is_active,
                                                result_id,
                                                evidence_description,
                                                evidence_url,
                                                evidence_role_id,
                                                deleted_at,
                                                is_private
                                            )
                                            SELECT
                                                re.created_at,
                                                re.created_by,
                                                re.updated_at,
                                                re.updated_by,
                                                re.is_active,
                                                new_result_id as result_id,
                                                re.evidence_description,
                                                re.evidence_url,
                                                re.evidence_role_id,
                                                re.deleted_at,
                                                re.is_private
                                            FROM
                                                result_evidences AS re
                                            WHERE re.is_active = TRUE
                                                AND re.result_id = temp_result_id;
                                        
                                        INSERT INTO result_capacity_sharing (
                                                created_at,
                                                created_by,
                                                updated_at,
                                                updated_by,
                                                is_active,
                                                result_id,
                                                training_title,
                                                session_format_id,
                                                session_type_id,
                                                degree_id,
                                                gender_id,
                                                session_length_id,
                                                session_purpose_id,
                                                session_purpose_description,
                                                session_participants_male,
                                                session_participants_female,
                                                session_participants_non_binary,
                                                session_description,
                                                is_attending_organization,
                                                start_date,
                                                end_date,
                                                delivery_modality_id,
                                                trainee_name,
                                                session_participants_total,
                                                deleted_at
                                            )
                                            SELECT
                                                rcs.created_at,
                                                rcs.created_by,
                                                rcs.updated_at,
                                                rcs.updated_by,
                                                rcs.is_active,
                                                new_result_id as result_id,
                                                rcs.training_title,
                                                rcs.session_format_id,
                                                rcs.session_type_id,
                                                rcs.degree_id,
                                                rcs.gender_id,
                                                rcs.session_length_id,
                                                rcs.session_purpose_id,
                                                rcs.session_purpose_description,
                                                rcs.session_participants_male,
                                                rcs.session_participants_female,
                                                rcs.session_participants_non_binary,
                                                rcs.session_description,
                                                rcs.is_attending_organization,
                                                rcs.start_date,
                                                rcs.end_date,
                                                rcs.delivery_modality_id,
                                                rcs.trainee_name,
                                                rcs.session_participants_total,
                                                rcs.deleted_at
                                            FROM
                                                result_capacity_sharing AS rcs
                                            WHERE rcs.is_active = TRUE
                                                AND rcs.result_id = temp_result_id;
                                            
                                    INSERT INTO result_ip_rights (
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        deleted_at,
                                        result_ip_rights_id,
                                        publicity_restriction,
                                        publicity_restriction_description,
                                        requires_futher_development,
                                        requires_futher_development_description,
                                        asset_ip_owner_id,
                                        asset_ip_owner_description,
                                        potential_asset,
                                        potential_asset_description,
                                        private_sector_engagement_id,
                                        formal_ip_rights_application_id
                                    )
                                    SELECT 
                                    rir.created_at,
                                    rir.created_by,
                                    rir.updated_at,
                                    rir.updated_by,
                                    rir.is_active,
                                    rir.deleted_at,
                                    new_result_id AS result_ip_rights_id,
                                    rir.publicity_restriction,
                                    rir.publicity_restriction_description,
                                    rir.requires_futher_development,
                                    rir.requires_futher_development_description,
                                    rir.asset_ip_owner_id,
                                    rir.asset_ip_owner_description,
                                    rir.potential_asset,
                                    rir.potential_asset_description,
                                    rir.private_sector_engagement_id,
                                    rir.formal_ip_rights_application_id
                                    FROM result_ip_rights rir 
                                    WHERE rir.is_active = true
                                        AND rir.result_ip_rights_id = temp_result_id;
                                    
                                    INSERT INTO result_actors (
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        deleted_at,
                                        result_id,
                                        actor_type_id,
                                        sex_age_disaggregation_not_apply,
                                        women_youth,
                                        women_not_youth,
                                        men_youth,
                                        men_not_youth,
                                        actor_role_id,
                                        actor_type_custom_name
                                    )
                                    SELECT 
                                    ra.created_at,
                                    ra.created_by,
                                    ra.updated_at,
                                    ra.updated_by,
                                    ra.is_active,
                                    ra.deleted_at,
                                    new_result_id AS result_id,
                                    ra.actor_type_id,
                                    ra.sex_age_disaggregation_not_apply,
                                    ra.women_youth,
                                    ra.women_not_youth,
                                    ra.men_youth,
                                    ra.men_not_youth,
                                    ra.actor_role_id,
                                    ra.actor_type_custom_name
                                    FROM result_actors ra 
                                    WHERE ra.is_active = TRUE
                                        AND ra.result_id = temp_result_id;
                                    
                                    INSERT INTO result_institution_types (
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        deleted_at,
                                        result_id,
                                        institution_type_id,
                                        institution_type_role_id,
                                        sub_institution_type_id,
                                        institution_type_custom_name,
                                        is_organization_known,
                                        institution_id
                                    )
                                    SELECT 
                                    rit.created_at,
                                    rit.created_by,
                                    rit.updated_at,
                                    rit.updated_by,
                                    rit.is_active,
                                    rit.deleted_at,
                                    new_result_id AS result_id,
                                    rit.institution_type_id,
                                    rit.institution_type_role_id,
                                    rit.sub_institution_type_id,
                                    rit.institution_type_custom_name,
                                    rit.is_organization_known,
                                    rit.institution_id
                                    FROM result_institution_types rit 
                                    WHERE rit.is_active = TRUE
                                        AND rit.result_id = temp_result_id;
                                    
                                    INSERT INTO result_innovation_dev(
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        deleted_at,
                                        result_id,
                                        short_title,
                                        innovation_nature_id,
                                        innovation_type_id,
                                        innovation_readiness_id,
                                        no_sex_age_disaggregation,
                                        anticipated_users_id,
                                        expected_outcome,
                                        intended_beneficiaries_description,
                                        is_knowledge_sharing,
                                        dissemination_qualification_id,
                                        tool_useful_context,
                                        results_achieved_expected,
                                        is_used_beyond_original_context,
                                        adoption_adaptation_context,
                                        other_tools,
                                        other_tools_integration,
                                        is_cheaper_than_alternatives,
                                        is_simpler_to_use,
                                        does_perform_better,
                                        is_desirable_to_users,
                                        has_commercial_viability,
                                        has_suitable_enabling_environment,
                                        has_evidence_of_uptake,
                                        expansion_potential_id,
                                        expansion_adaptation_details,
                                        new_or_improved_varieties_count,
                                        is_new_or_improved_variety,
                                        innovation_readiness_explanation
                                    )
                                    SELECT 
                                    rid.created_at,
                                    rid.created_by,
                                    rid.updated_at,
                                    rid.updated_by,
                                    rid.is_active,
                                    rid.deleted_at,
                                    new_result_id AS result_id,
                                    rid.short_title,
                                    rid.innovation_nature_id,
                                    rid.innovation_type_id,
                                    rid.innovation_readiness_id,
                                    rid.no_sex_age_disaggregation,
                                    rid.anticipated_users_id,
                                    rid.expected_outcome,
                                    rid.intended_beneficiaries_description,
                                    rid.is_knowledge_sharing,
                                    rid.dissemination_qualification_id,
                                    rid.tool_useful_context,
                                    rid.results_achieved_expected,
                                    rid.is_used_beyond_original_context,
                                    rid.adoption_adaptation_context,
                                    rid.other_tools,
                                    rid.other_tools_integration,
                                    rid.is_cheaper_than_alternatives,
                                    rid.is_simpler_to_use,
                                    rid.does_perform_better,
                                    rid.is_desirable_to_users,
                                    rid.has_commercial_viability,
                                    rid.has_suitable_enabling_environment,
                                    rid.has_evidence_of_uptake,
                                    rid.expansion_potential_id,
                                    rid.expansion_adaptation_details,
                                    rid.new_or_improved_varieties_count,
                                    rid.is_new_or_improved_variety,
                                    rid.innovation_readiness_explanation
                                    FROM result_innovation_dev rid 
                                    WHERE rid.is_active = TRUE
                                        AND rid.result_id = temp_result_id;
                                    
                                    INSERT 
                                        INTO 
                                        result_innovation_tool_function(
                                        created_at,
                                        created_by,
                                        deleted_at,
                                        is_active,
                                        tool_function_id,
                                        result_id,
                                        updated_at,
                                        updated_by)
                                    SELECT 
                                        ritf.created_at,
                                        ritf.created_by,
                                        ritf.deleted_at,
                                        ritf.is_active,
                                        ritf.tool_function_id,
                                        new_result_id as result_id,
                                        ritf.updated_at,
                                        ritf.updated_by 
                                    FROM result_innovation_tool_function ritf 
                                    WHERE ritf.is_active = TRUE
                                        AND ritf.result_id = temp_result_id;
                                    
                                    INSERT INTO result_sdgs(
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        deleted_at,
                                        result_id,
                                        clarisa_sdg_id
                                    )
                                    SELECT 
                                    rs.created_at,
                                    rs.created_by,
                                    rs.updated_at,
                                    rs.updated_by,
                                    rs.is_active,
                                    rs.deleted_at,
                                    new_result_id as result_id,
                                    rs.clarisa_sdg_id
                                    FROM result_sdgs rs
                                    WHERE rs.is_active = TRUE
                                        AND rs.result_id = temp_result_id;
                                            
                                    INSERT INTO result_policy_change (
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        result_id,
                                        policy_type_id,
                                        policy_stage_id,
                                        evidence_stage,
                                        deleted_at
                                    )
                                    SELECT
                                        rpc.created_at,
                                        rpc.created_by,
                                        rpc.updated_at,
                                        rpc.updated_by,
                                        rpc.is_active,
                                        new_result_id as result_id,
                                        rpc.policy_type_id,
                                        rpc.policy_stage_id,
                                        rpc.evidence_stage,
                                        rpc.deleted_at
                                    FROM
                                        result_policy_change AS rpc
                                    WHERE rpc.is_active = TRUE
                                        AND rpc.result_id = temp_result_id;
                                    
                                    INSERT INTO result_regions (
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        result_id,
                                        region_id,
                                        deleted_at
                                    )
                                    SELECT
                                        rr.created_at,
                                        rr.created_by,
                                        rr.updated_at,
                                        rr.updated_by,
                                        rr.is_active,
                                        new_result_id as result_id,
                                        rr.region_id,
                                        rr.deleted_at
                                    FROM
                                        result_regions AS rr
                                    WHERE rr.is_active = TRUE 
                                        AND rr.result_id = temp_result_id;
                                    
                                    INSERT INTO result_countries (
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        result_id,
                                        country_role_id,
                                        isoAlpha2,
                                        deleted_at
                                    )
                                    SELECT
                                        rc.created_at,
                                        rc.created_by,
                                        rc.updated_at,
                                        rc.updated_by,
                                        rc.is_active,
                                        new_result_id as result_id,
                                        rc.country_role_id,
                                        rc.isoAlpha2,
                                        rc.deleted_at
                                    FROM
                                        result_countries AS rc
                                    WHERE rc.is_active = TRUE
                                        AND rc.result_id = temp_result_id;
                                    
                                    
                                    INSERT 
                                        INTO result_countries_sub_nationals(
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        result_country_id,
                                        sub_national_id,
                                        deleted_at
                                        )
                                        SELECT 
                                        rcsn.created_at,
                                        rcsn.created_by,
                                        rcsn.updated_at,
                                        rcsn.updated_by,
                                        rcsn.is_active,
                                        temp.result_country_id AS result_country_id,
                                        rcsn.sub_national_id,
                                        rcsn.deleted_at
                                    from result_countries rc 
                                        inner join result_countries_sub_nationals rcsn on rc.result_country_id = rcsn.result_country_id
                                        inner join (select rc2.result_country_id, rc2.result_id, rc2.isoAlpha2  from result_countries rc2 
                                                                inner join results r on r.result_id = rc2.result_id 
                                                                            and r.is_active = true
                                                                            and r.result_id = new_result_id) temp on temp.isoAlpha2 = rc.isoAlpha2
                                    where rc.result_id = temp_result_id
                                        and rcsn.is_active = true
                                        and rc.is_active = true;
                                                                            
                                                                        
                                    
                                    INSERT INTO result_languages (
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        result_id,
                                        language_id,
                                        language_role_id,
                                        deleted_at
                                    )
                                    SELECT
                                        rl.created_at,
                                        rl.created_by,
                                        rl.updated_at,
                                        rl.updated_by,
                                        rl.is_active,
                                        new_result_id as result_id,
                                        rl.language_id,
                                        rl.language_role_id,
                                        rl.deleted_at
                                    FROM
                                        result_languages AS rl
                                    WHERE rl.is_active = TRUE
                                        AND rl.result_id = temp_result_id;
                                    
                                    INSERT INTO submission_history (
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        deleted_at,
                                        result_id,
                                        submission_comment,
                                        from_status_id,
                                        to_status_id
                                    )
                                    SELECT
                                        rh.created_at,
                                        rh.created_by,
                                        rh.updated_at,
                                        rh.updated_by,
                                        rh.is_active,
                                        rh.deleted_at,
                                        new_result_id as result_id,
                                        rh.submission_comment,
                                        rh.from_status_id,
                                        rh.to_status_id
                                    FROM
                                        submission_history AS rh
                                    WHERE rh.is_active = TRUE
                                        AND rh.result_id = temp_result_id;
                                    
                                    SELECT *
                                    FROM results r
                                    WHERE r.result_id = new_result_id;
                                    
                                END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Final view structure for view `report_alliance_alignment`
--

/*!50001 DROP VIEW IF EXISTS `report_alliance_alignment`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `report_alliance_alignment` AS select `root`.`result_id` AS `result_id`,`report_field`(`pp`.`project`,true,NULL) AS `primary_project`,`report_field`(`pp`.`principal_investigator`,true,NULL) AS `primary_project_principal_investigator`,`report_field`(`pp`.`start_date`,true,NULL) AS `primary_project_start_date`,`report_field`(`pp`.`end_date`,true,NULL) AS `primary_project_end_date`,`report_field`(`cp`.`projects`,false,NULL) AS `contributing_projects`,`report_field`(`rl`.`primary_lever`,true,NULL) AS `primary_lever`,`report_field`(`rl`.`contributor_lever`,false,NULL) AS `contributor_lever`,`report_field`(`sdt`.`sdg_targets`,true,NULL) AS `sdg_targets`,`report_field`(`so`.`strategic_outcome`,true,(`root`.`indicator_id` = 5)) AS `strategic_outcomes` from (((((`results` `root` left join (select `rc`.`result_id` AS `result_id`,concat_ws('','[',`ac`.`agreement_id`,'] ',`ac`.`description`) AS `project`,`ac`.`project_lead_description` AS `principal_investigator`,date_format(`ac`.`start_date`,'%Y-%m-%d') AS `start_date`,date_format(`ac`.`end_date`,'%Y-%m-%d') AS `end_date` from (`result_contracts` `rc` left join `agresso_contracts` `ac` on((`ac`.`agreement_id` = `rc`.`contract_id`))) where ((`rc`.`is_primary` = true) and (`rc`.`is_active` = true)) group by `rc`.`result_id` order by `rc`.`updated_by` desc) `pp` on((`pp`.`result_id` = `root`.`result_id`))) left join (select `rc`.`result_id` AS `result_id`,group_concat(concat_ws('','• [',`ac`.`agreement_id`,'] ',`ac`.`description`) separator '\n') AS `projects` from (`result_contracts` `rc` left join `agresso_contracts` `ac` on((`ac`.`agreement_id` = `rc`.`contract_id`))) where ((`rc`.`is_primary` = false) and (`rc`.`is_active` = true)) group by `rc`.`result_id` order by `rc`.`updated_by` desc) `cp` on((`cp`.`result_id` = `root`.`result_id`))) left join (select `rl`.`result_id` AS `result_id`,group_concat((case when (`rl`.`is_primary` = true) then `cl`.`short_name` end) order by `rl`.`lever_id` ASC separator ', ') AS `primary_lever`,group_concat((case when (`rl`.`is_primary` = false) then `cl`.`short_name` end) order by `rl`.`lever_id` ASC separator ', ') AS `contributor_lever` from (`result_levers` `rl` left join `clarisa_levers` `cl` on((`cl`.`id` = `rl`.`lever_id`))) where (`rl`.`is_active` = true) group by `rl`.`result_id`) `rl` on((`rl`.`result_id` = `root`.`result_id`))) left join (select `rl`.`result_id` AS `result_id`,group_concat(concat_ws('','• (',`cl`.`short_name`,') - ',`cst`.`sdg_target_code`,' - ',`cst`.`sdg_target`) separator '\n') AS `sdg_targets` from (((`result_levers` `rl` left join `clarisa_levers` `cl` on((`cl`.`id` = `rl`.`lever_id`))) join `result_lever_sdg_targets` `rlst` on(((`rlst`.`result_lever_id` = `rl`.`result_lever_id`) and (`rlst`.`is_active` = true)))) left join `clarisa_sdg_targets` `cst` on((`cst`.`id` = `rlst`.`sdg_target_id`))) where (`rl`.`is_active` = true) group by `rl`.`result_id`) `sdt` on((`sdt`.`result_id` = `root`.`result_id`))) left join (select `rl`.`result_id` AS `result_id`,group_concat(concat_ws('','• (',`cl`.`short_name`,') - ',`lso`.`strategic_outcome`) separator '\n') AS `strategic_outcome` from (((`result_levers` `rl` left join `clarisa_levers` `cl` on((`cl`.`id` = `rl`.`lever_id`))) join `result_lever_strategic_outcome` `rlso` on(((`rlso`.`result_lever_id` = `rl`.`result_lever_id`) and (`rlso`.`is_active` = true)))) join `lever_strategic_outcome` `lso` on((`lso`.`id` = `rlso`.`lever_strategic_outcome_id`))) where (`rl`.`is_active` = true) group by `rl`.`result_id`) `so` on((`so`.`result_id` = `root`.`result_id`))) where ((`root`.`is_active` = true) and (`root`.`is_snapshot` = false)) order by `root`.`result_id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `report_capacity_sharing_development`
--

/*!50001 DROP VIEW IF EXISTS `report_capacity_sharing_development`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `report_capacity_sharing_development` AS select `root`.`result_id` AS `result_id`,`report_field`(`sf`.`name`,true,(`root`.`indicator_id` = 1)) AS `training_engagement_report`,`report_field`(`st`.`name`,true,(`root`.`indicator_id` = 1)) AS `is_this_training_engagement`,`report_field`(`sl`.`name`,true,(`root`.`indicator_id` = 1)) AS `length_training`,`report_field`(`d`.`name`,true,(`root`.`indicator_id` = 1)) AS `degree`,`report_field`(`ts`.`traning_supervisor`,true,(`root`.`indicator_id` = 1)) AS `traning_supervisor`,`report_field`(`rl`.`language`,true,(`root`.`indicator_id` = 1)) AS `language`,`report_field`(date_format(`rcs`.`start_date`,'%Y-%m-%d'),true,(`root`.`indicator_id` = 1)) AS `start_date`,`report_field`(date_format(`rcs`.`end_date`,'%Y-%m-%d'),true,(`root`.`indicator_id` = 1)) AS `end_date`,`report_field`(`dm`.`name`,true,(`root`.`indicator_id` = 1)) AS `delivery_modality`,`report_field`(`ita`.`individual_trainee_affiliation`,true,((`rcs`.`session_format_id` = 1) and (`root`.`indicator_id` = 1))) AS `individual_trainee_affiliation`,`report_field`(`rcs`.`trainee_name`,true,((`sf`.`session_format_id` = 1) and (`root`.`indicator_id` = 1))) AS `individual_trainee_name`,`report_field`(`itn`.`individual_trainee_nationality`,true,((`rcs`.`session_format_id` = 1) and (`root`.`indicator_id` = 1))) AS `individual_trainee_nationality`,`report_field`(`g`.`name`,true,((`sf`.`session_format_id` = 1) and (`root`.`indicator_id` = 1))) AS `individual_gender`,`report_field`(`rcs`.`session_participants_total`,true,((`sf`.`session_format_id` = 2) and (`root`.`indicator_id` = 1))) AS `group_session_participants_total`,`report_field`(`rcs`.`session_participants_female`,false,((`sf`.`session_format_id` = 2) and (`root`.`indicator_id` = 1))) AS `group_session_participants_female`,`report_field`(`rcs`.`session_participants_male`,false,((`sf`.`session_format_id` = 2) and (`root`.`indicator_id` = 1))) AS `group_session_participants_male`,`report_field`(`rcs`.`session_participants_non_binary`,false,((`sf`.`session_format_id` = 2) and (`root`.`indicator_id` = 1))) AS `group_session_participants_non_binary`,`report_field`(`sp`.`name`,true,((`sf`.`session_format_id` = 2) and (`root`.`indicator_id` = 1))) AS `group_session_purpose_name`,`report_field`(`rcs`.`session_purpose_description`,true,((`sf`.`session_format_id` = 2) and (`rcs`.`session_purpose_id` = 4) and (`rcs`.`session_purpose_id` is not null) and (`root`.`indicator_id` = 1))) AS `group_session_purpose_description`,`report_field`(if((`rcs`.`is_attending_organization` is null),NULL,if(`rcs`.`is_attending_organization`,'YES','NO')),true,((`sf`.`session_format_id` = 2) and (`root`.`indicator_id` = 1))) AS `group_is_attending_organization` from ((((((((((((`results` `root` left join `result_capacity_sharing` `rcs` on((`rcs`.`result_id` = `root`.`result_id`))) left join `delivery_modalities` `dm` on((`dm`.`delivery_modality_id` = `rcs`.`delivery_modality_id`))) left join `session_formats` `sf` on((`sf`.`session_format_id` = `rcs`.`session_format_id`))) left join `session_types` `st` on((`st`.`session_type_id` = `rcs`.`session_type_id`))) left join `degrees` `d` on((`d`.`degree_id` = `rcs`.`degree_id`))) left join `session_lengths` `sl` on((`sl`.`session_length_id` = `rcs`.`session_length_id`))) left join `session_purposes` `sp` on((`sp`.`session_purpose_id` = `rcs`.`session_purpose_id`))) left join `gender` `g` on((`g`.`gender_id` = `rcs`.`gender_id`))) left join (select `ru`.`result_id` AS `result_id`,concat_ws('',`aus`.`first_name`,' ',`aus`.`last_name`) AS `traning_supervisor` from (`result_users` `ru` left join `alliance_user_staff` `aus` on((`aus`.`carnet` = `ru`.`user_id`))) where ((`ru`.`is_active` = true) and (`ru`.`informative_role_id` = 2)) group by `ru`.`result_id`) `ts` on((`ts`.`result_id` = `root`.`result_id`))) left join (select `rl`.`result_id` AS `result_id`,`cl`.`name` AS `language` from (`result_languages` `rl` join `clarisa_languages` `cl` on((`cl`.`id` = `rl`.`language_id`))) where ((`rl`.`language_role_id` = 1) and (`rl`.`is_active` = true)) group by `rl`.`result_id`) `rl` on((`rl`.`result_id` = `root`.`result_id`))) left join (select `ri`.`result_id` AS `result_id`,concat_ws('','[id: ',`ci`.`code`,'] ',`ci`.`acronym`,' - (HQ:',`cil`.`name`,') ',`ci`.`name`) AS `individual_trainee_affiliation` from ((`result_institutions` `ri` join `clarisa_institutions` `ci` on((`ci`.`code` = `ri`.`institution_id`))) left join `clarisa_institution_locations` `cil` on(((`cil`.`institution_id` = `ci`.`code`) and (`cil`.`isHeadquarter` = true)))) where (`ri`.`institution_role_id` = 1) group by `ri`.`result_id`) `ita` on((`ita`.`result_id` = `root`.`result_id`))) left join (select `rc`.`result_id` AS `result_id`,concat_ws('','[',`cc`.`isoAlpha2`,'] ',`cc`.`name`) AS `individual_trainee_nationality` from (`result_countries` `rc` left join `clarisa_countries` `cc` on((`cc`.`isoAlpha2` = `rc`.`isoAlpha2`))) where ((`rc`.`is_active` = true) and (`rc`.`country_role_id` = 1)) group by `rc`.`result_id`) `itn` on((`itn`.`result_id` = `root`.`result_id`))) where ((`root`.`is_active` = true) and (`root`.`is_snapshot` = false)) order by `root`.`result_id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `report_evidences`
--

/*!50001 DROP VIEW IF EXISTS `report_evidences`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_520_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `report_evidences` AS select `root`.`result_id` AS `result_id`,`report_field`(`re`.`evidences`,true,NULL) AS `evidences`,`report_field`(group_concat(concat_ws('','• Type: ',`report_field`(`nrt`.`name`,true,true),' - Link: ',`report_field`(`rnr`.`link`,true,true)) separator '\n'),true,(`root`.`indicator_id` = 5)) AS `notable_references` from (((`results` `root` left join (select `re`.`result_id` AS `result_id`,group_concat(concat_ws('','• <',`re`.`evidence_url`,'> ',`re`.`evidence_description`,' [Is public: ',convert(if(`re`.`is_private`,'FALSE','TRUE') using utf8mb3),']') separator '\n') AS `evidences` from `result_evidences` `re` where (`re`.`is_active` = true) group by `re`.`result_id`) `re` on((`re`.`result_id` = `root`.`result_id`))) left join `result_notable_references` `rnr` on(((`rnr`.`result_id` = `root`.`result_id`) and (`rnr`.`is_active` = true)))) left join `notable_reference_types` `nrt` on((`nrt`.`id` = `rnr`.`notable_reference_type_id`))) where ((`root`.`is_active` = true) and (`root`.`is_snapshot` = false)) group by `root`.`result_id` order by `root`.`result_id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `report_general_information`
--

/*!50001 DROP VIEW IF EXISTS `report_general_information`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_520_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `report_general_information` AS select `root`.`result_id` AS `result_id`,`root`.`result_official_code` AS `result_code`,`root`.`platform_code` AS `platform_code`,`root`.`public_link` AS `public_link`,`root`.`external_link` AS `platform_link`,`i`.`name` AS `indicator`,`rs`.`name` AS `status`,`report_field`(`root`.`title`,true,NULL) AS `result_title`,`report_field`(`root`.`description`,true,NULL) AS `result_description`,`report_field`(`root`.`report_year_id`,true,NULL) AS `reporting_year`,`versions`.`reporting_years` AS `approved_versions`,`report_field`(`rk`.`keywords`,false,NULL) AS `keywords`,concat_ws('',`su`.`first_name`,' ',`su`.`last_name`) AS `creator`,date_format(`root`.`created_at`,'%Y-%m-%d') AS `creation_date`,`report_field`(`mcp`.`user_name`,true,NULL) AS `main_contact_person` from ((((((`results` `root` join `indicators` `i` on((`i`.`indicator_id` = `root`.`indicator_id`))) join `result_status` `rs` on((`rs`.`result_status_id` = `root`.`result_status_id`))) left join (select `versions`.`result_official_code` AS `result_official_code`,group_concat(`versions`.`report_year_id` separator ', ') AS `reporting_years` from `results` `versions` where ((`versions`.`is_active` = true) and (`versions`.`is_snapshot` = true)) group by `versions`.`result_official_code`) `versions` on((`versions`.`result_official_code` = `root`.`result_official_code`))) left join (select `rk`.`result_id` AS `result_id`,group_concat(`rk`.`keyword` separator ', ') AS `keywords` from `result_keywords` `rk` where (`rk`.`is_active` = true) group by `rk`.`result_id`) `rk` on((`rk`.`result_id` = `root`.`result_id`))) left join `sec_users` `su` on((`su`.`sec_user_id` = `root`.`created_by`))) left join (select `ru`.`result_id` AS `result_id`,concat_ws('',`aus`.`first_name`,' ',`aus`.`last_name`) AS `user_name` from (`result_users` `ru` left join `alliance_user_staff` `aus` on((`aus`.`carnet` = `ru`.`user_id`))) where ((`ru`.`user_role_id` = 1) and (`ru`.`is_active` = true)) group by `ru`.`result_id` order by `ru`.`updated_by` desc) `mcp` on((`mcp`.`result_id` = `root`.`result_id`))) where ((`root`.`is_active` = true) and (`root`.`is_snapshot` = false)) order by `root`.`result_id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `report_geo_location`
--

/*!50001 DROP VIEW IF EXISTS `report_geo_location`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_520_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `report_geo_location` AS select `root`.`result_id` AS `result_id`,`report_field`(`cgs`.`name`,true,NULL) AS `geo_scope_name`,`report_field`(`rc`.`countries`,(`root`.`geo_scope_id` in (3,4,5)),(`root`.`geo_scope_id` in (1,3,4,5))) AS `countries`,`report_field`(`rr`.`regions`,(`root`.`geo_scope_id` = 2),(`root`.`geo_scope_id` in (1,2))) AS `regions`,`report_field`(`rc`.`sub_nationals`,(`root`.`geo_scope_id` = 5),(`root`.`geo_scope_id` = 5)) AS `sub_nationals` from (((`results` `root` left join `clarisa_geo_scope` `cgs` on((`cgs`.`code` = `root`.`geo_scope_id`))) left join (select `rc`.`result_id` AS `result_id`,group_concat(concat('(',`cc`.`isoAlpha2`,') ',`cc`.`name`) separator ', ') AS `countries`,if((`rcs`.`sub_nationals` is not null),group_concat(concat_ws('','• ',concat('(',`cc`.`isoAlpha2`,') ',`cc`.`name`),': ',`rcs`.`sub_nationals`) separator '\n'),NULL) AS `sub_nationals` from ((`result_countries` `rc` join `clarisa_countries` `cc` on((`cc`.`isoAlpha2` = `rc`.`isoAlpha2`))) left join (select `rcsn`.`result_country_id` AS `result_country_id`,group_concat(concat_ws('','(',`csn`.`code`,') ',`csn`.`name`) separator ', ') AS `sub_nationals` from (`result_countries_sub_nationals` `rcsn` join `clarisa_sub_nationals` `csn` on((`csn`.`id` = `rcsn`.`sub_national_id`))) where (`rcsn`.`is_active` = true) group by `rcsn`.`result_country_id`) `rcs` on((`rcs`.`result_country_id` = `rc`.`result_country_id`))) where ((`rc`.`is_active` = true) and (`rc`.`country_role_id` = 2)) group by `rc`.`result_id`) `rc` on((`rc`.`result_id` = `root`.`result_id`))) left join (select `rr`.`result_id` AS `result_id`,group_concat(`cr`.`name` separator ', ') AS `regions` from (`result_regions` `rr` join `clarisa_regions` `cr` on((`cr`.`um49Code` = `rr`.`region_id`))) where (`rr`.`is_active` = true) group by `rr`.`result_id`) `rr` on((`rr`.`result_id` = `root`.`result_id`))) where ((`root`.`is_active` = true) and (`root`.`is_snapshot` = false)) order by `root`.`result_id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `report_innovation_dev`
--

/*!50001 DROP VIEW IF EXISTS `report_innovation_dev`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_520_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `report_innovation_dev` AS select `root`.`result_id` AS `result_id`,`report_field`(`rid`.`short_title`,true,(`root`.`indicator_id` = 2)) AS `short_title`,`report_field`(`cic`.`name`,true,(`root`.`indicator_id` = 2)) AS `innovation_nature`,`report_field`(`cit`.`name`,true,(`root`.`indicator_id` = 2)) AS `innovation_type`,`report_field`(concat('(IRL ',`cirl`.`level`,') ',`cirl`.`name`),true,(`root`.`indicator_id` = 2)) AS `innovation_readiness_level`,`report_field`(`rid`.`innovation_readiness_explanation`,true,(`root`.`indicator_id` = 2)) AS `innovation_readiness_explanation`,`report_field`(if(`rid`.`no_sex_age_disaggregation`,'YES','NO'),false,(`root`.`indicator_id` = 2)) AS `no_sex_age_disaggregation`,`report_field`(`idau`.`name`,true,(`root`.`indicator_id` = 2)) AS `anticipated_users`,`report_field`(`rid`.`expected_outcome`,true,((`root`.`indicator_id` = 2) and (`rid`.`anticipated_users_id` <> 1) and (`rid`.`anticipated_users_id` is not null))) AS `expected_outcome`,`report_field`(`rid`.`intended_beneficiaries_description`,true,((`root`.`indicator_id` = 2) and (`rid`.`anticipated_users_id` <> 1) and (`rid`.`anticipated_users_id` is not null))) AS `intended_beneficiaries_description`,`report_field`(if(`rid`.`is_new_or_improved_variety`,'YES','NO'),false,(`root`.`indicator_id` = 2)) AS `is_new_or_improved_variety`,`report_field`(`rid`.`new_or_improved_varieties_count`,false,((`root`.`indicator_id` = 2) and (`rid`.`is_new_or_improved_variety` = true))) AS `new_or_improved_varieties_count`,`report_field`(`ra`.`actors`,false,((`root`.`indicator_id` = 2) and (`rid`.`anticipated_users_id` <> 1) and (`rid`.`anticipated_users_id` is not null))) AS `actors`,`report_field`(`rit`.`institution_types`,false,((`root`.`indicator_id` = 2) and (`rid`.`anticipated_users_id` <> 1) and (`rid`.`anticipated_users_id` is not null))) AS `innovation_partners`,`report_field`(if(`rid`.`is_knowledge_sharing`,'YES','NO'),false,(`root`.`indicator_id` = 2)) AS `is_knowledge_sharing`,`report_field`(`dq`.`name`,true,((`root`.`indicator_id` = 2) and (`rid`.`is_knowledge_sharing` = true))) AS `dissemination_qualification`,`report_field`(`rid`.`tool_useful_context`,false,((`root`.`indicator_id` = 2) and (`rid`.`is_knowledge_sharing` = true))) AS `tool_useful_context`,`report_field`(`rid`.`results_achieved_expected`,false,((`root`.`indicator_id` = 2) and (`rid`.`is_knowledge_sharing` = true))) AS `results_achieved_expected`,`report_field`(`tf`.`tool_functions`,false,((`root`.`indicator_id` = 2) and (`rid`.`is_knowledge_sharing` = true))) AS `tool_functions`,`report_field`(if(`rid`.`is_used_beyond_original_context`,'YES','NO'),false,((`root`.`indicator_id` = 2) and (`rid`.`is_knowledge_sharing` = true))) AS `is_used_beyond_original_context`,`report_field`(`rid`.`adoption_adaptation_context`,false,((`root`.`indicator_id` = 2) and (`rid`.`is_knowledge_sharing` = true) and (`rid`.`is_used_beyond_original_context` = true))) AS `adoption_adaptation_context`,`report_field`(`rid`.`other_tools`,false,((`root`.`indicator_id` = 2) and (`rid`.`is_knowledge_sharing` = true))) AS `other_tools`,`report_field`(`rid`.`other_tools_integration`,false,((`root`.`indicator_id` = 2) and (`rid`.`is_knowledge_sharing` = true) and (`rid`.`other_tools` is not null))) AS `other_tools_integration`,`report_field`(`lr`.`link_to_results`,false,((`root`.`indicator_id` = 2) and (`rid`.`is_knowledge_sharing` = true))) AS `link_to_results`,`report_field`(`rid`.`is_cheaper_than_alternatives`,false,(`root`.`indicator_id` = 2)) AS `is_cheaper_than_alternatives`,`report_field`(`rid`.`is_simpler_to_use`,false,(`root`.`indicator_id` = 2)) AS `is_simpler_to_use`,`report_field`(`rid`.`does_perform_better`,false,(`root`.`indicator_id` = 2)) AS `does_perform_better`,`report_field`(`rid`.`is_desirable_to_users`,false,(`root`.`indicator_id` = 2)) AS `is_desirable_to_users`,`report_field`(`rid`.`has_commercial_viability`,false,(`root`.`indicator_id` = 2)) AS `has_commercial_viability`,`report_field`(`rid`.`has_suitable_enabling_environment`,false,(`root`.`indicator_id` = 2)) AS `has_suitable_enabling_environment`,`report_field`(`rid`.`has_evidence_of_uptake`,false,(`root`.`indicator_id` = 2)) AS `has_evidence_of_uptake`,`report_field`(`ep`.`name`,false,(`root`.`indicator_id` = 2)) AS `expansion_potential`,`report_field`(`rid`.`expansion_adaptation_details`,false,((`root`.`indicator_id` = 2) and (`rid`.`expansion_potential_id` = 2))) AS `expansion_adaptation_details` from (((((((((((`results` `root` left join `result_innovation_dev` `rid` on((`rid`.`result_id` = `root`.`result_id`))) left join `clarisa_innovation_characteristics` `cic` on((`cic`.`id` = `rid`.`innovation_nature_id`))) left join `clarisa_innovation_types` `cit` on((`cit`.`code` = `rid`.`innovation_type_id`))) left join `clarisa_innovation_readiness_levels` `cirl` on((`cirl`.`id` = `rid`.`innovation_readiness_id`))) left join `innovation_dev_anticipated_users` `idau` on((`idau`.`id` = `rid`.`anticipated_users_id`))) left join `dissemination_qualifications` `dq` on((`dq`.`id` = `rid`.`dissemination_qualification_id`))) left join `expansion_potentials` `ep` on((`ep`.`id` = `rid`.`expansion_potential_id`))) left join (select `ra`.`result_id` AS `result_id`,group_concat(concat_ws('','• ',ifnull(nullif(`ra`.`actor_type_custom_name`,''),`cat`.`name`),convert(if(((0 <> `ra`.`women_youth`) or (0 <> `ra`.`women_not_youth`) or (0 <> `ra`.`men_youth`) or (0 <> `ra`.`men_not_youth`)),concat_ws('',' [',if(`ra`.`women_youth`,'Women Youth, ',''),if(`ra`.`women_not_youth`,'Women Non-youth, ',''),if(`ra`.`men_youth`,'Men Youth, ',''),if(`ra`.`men_not_youth`,'Men Non-youth',''),']'),'') using utf8mb3)) separator '\n') AS `actors` from (`result_actors` `ra` join `clarisa_actor_types` `cat` on((`cat`.`code` = `ra`.`actor_type_id`))) where ((`ra`.`actor_role_id` = 1) and (`ra`.`is_active` = true)) group by `ra`.`result_id`) `ra` on((`ra`.`result_id` = `root`.`result_id`))) left join (select `rit`.`result_id` AS `result_id`,group_concat(concat_ws('','• ',if(`rit`.`is_organization_known`,concat_ws('','[id: ',`ci`.`code`,'] ',`ci`.`acronym`,' - (HQ: ',`cil`.`name`,') ',`ci`.`name`),ifnull(ifnull(concat_ws(' > ',`cit_parent`.`name`,`cit_sub`.`name`),`rit`.`institution_type_custom_name`),`cit_main`.`name`))) separator '\n') AS `institution_types` from (((((`result_institution_types` `rit` left join `clarisa_institution_types` `cit_main` on((`cit_main`.`code` = `rit`.`institution_type_id`))) left join `clarisa_institution_types` `cit_sub` on((`cit_sub`.`code` = `rit`.`sub_institution_type_id`))) left join `clarisa_institution_types` `cit_parent` on((`cit_parent`.`code` = `cit_sub`.`parent_code`))) left join `clarisa_institutions` `ci` on((`ci`.`code` = `rit`.`institution_id`))) left join `clarisa_institution_locations` `cil` on(((`cil`.`institution_id` = `ci`.`code`) and (`cil`.`isHeadquarter` = true)))) where ((`rit`.`institution_type_role_id` = 1) and (`rit`.`is_active` = true)) group by `rit`.`result_id`) `rit` on((`rit`.`result_id` = `root`.`result_id`))) left join (select `ritf`.`result_id` AS `result_id`,group_concat(concat_ws('','• ',`tf`.`name`) separator '\n') AS `tool_functions` from (`result_innovation_tool_function` `ritf` join `tool_functions` `tf` on((`tf`.`id` = `ritf`.`tool_function_id`))) where (`ritf`.`is_active` = true) group by `ritf`.`result_id`) `tf` on((`tf`.`result_id` = `root`.`result_id`))) left join (select `lr`.`result_id` AS `result_id`,group_concat(concat_ws('','• [',`i`.`name`,'] ',`r`.`result_official_code`,' - ',`r`.`title`) separator '\n') AS `link_to_results` from ((`link_results` `lr` join `results` `r` on((`r`.`result_id` = `lr`.`other_result_id`))) left join `indicators` `i` on((`i`.`indicator_id` = `r`.`indicator_id`))) where ((`lr`.`link_result_role_id` = 2) and (`lr`.`is_active` = true)) group by `lr`.`result_id`) `lr` on((`lr`.`result_id` = `root`.`result_id`))) where ((`root`.`is_active` = true) and (`root`.`is_snapshot` = false)) order by `root`.`result_id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `report_ip_rights`
--

/*!50001 DROP VIEW IF EXISTS `report_ip_rights`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_520_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `report_ip_rights` AS select `root`.`result_id` AS `result_id`,`report_field`(`rir`.`who_owns_ip_rights`,true,NULL) AS `who_owns_ip_rights`,`report_field`(`rir`.`third_party`,true,NULL) AS `third_party`,`report_field`(`rir`.`legal_restrictions_publication`,true,NULL) AS `legal_restrictions_publication`,`report_field`(`rir`.`commercialization_potential_asset`,true,NULL) AS `commercialization_potential_asset`,`report_field`(`rir`.`asset_need_refinement`,true,NULL) AS `asset_need_refinement` from (`results` `root` left join (select `rir`.`result_ip_rights_id` AS `result_id`,`ipo`.`name` AS `who_owns_ip_rights`,`rir`.`asset_ip_owner_description` AS `third_party`,if((`rir`.`publicity_restriction` is null),NULL,concat_ws('','[',if(`rir`.`publicity_restriction`,'YES','NO'),']',if((`rir`.`publicity_restriction` = true),concat_ws('',' ',`report_field`(`rir`.`publicity_restriction_description`,(`rir`.`publicity_restriction` = true),(`rir`.`publicity_restriction` = true))),''))) AS `legal_restrictions_publication`,if((`rir`.`potential_asset` is null),NULL,concat_ws('','[',if(`rir`.`potential_asset`,'YES','NO'),']',if((`rir`.`potential_asset` = true),concat_ws('',' ',`report_field`(`rir`.`potential_asset_description`,(`rir`.`potential_asset` = true),(`rir`.`potential_asset` = true))),''))) AS `commercialization_potential_asset`,if((`rir`.`requires_futher_development` is null),NULL,concat_ws('','[',if(`rir`.`requires_futher_development`,'YES','NO'),']',if((`rir`.`requires_futher_development` = true),concat_ws('',' ',`report_field`(`rir`.`requires_futher_development_description`,(`rir`.`requires_futher_development` = true),(`rir`.`requires_futher_development` = true))),''))) AS `asset_need_refinement` from (`result_ip_rights` `rir` left join `intellectual_property_owner` `ipo` on((`ipo`.`intellectual_property_owner_id` = `rir`.`asset_ip_owner_id`))) where (`rir`.`is_active` = true) order by `rir`.`result_ip_rights_id`) `rir` on((`rir`.`result_id` = `root`.`result_id`))) where ((`root`.`is_active` = true) and (`root`.`is_snapshot` = false)) order by `root`.`result_id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `report_link_result`
--

/*!50001 DROP VIEW IF EXISTS `report_link_result`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `report_link_result` AS select `root`.`result_id` AS `result_id`,`report_field`(group_concat(concat('','• [',`i`.`name`,'] ',`r`.`result_official_code`,' - ',`r`.`title`) separator '\n'),false,NULL) AS `link_results` from (((`results` `root` left join `link_results` `lr` on(((`lr`.`result_id` = `root`.`result_id`) and (`lr`.`link_result_role_id` = 4)))) left join `results` `r` on((`r`.`result_id` = `lr`.`other_result_id`))) left join `indicators` `i` on((`i`.`indicator_id` = `r`.`indicator_id`))) where ((0 <> `root`.`is_active`) and (0 = `root`.`is_snapshot`)) group by `root`.`result_id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `report_oicr`
--

/*!50001 DROP VIEW IF EXISTS `report_oicr`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_520_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `report_oicr` AS select `root`.`result_id` AS `result_id`,`report_field`(`ro`.`general_comment`,true,(`root`.`indicator_id` = 5)) AS `general_comment`,`report_field`(`ml`.`full_name`,true,(`root`.`indicator_id` = 5)) AS `maturity_level`,`report_field`(`ro`.`oicr_internal_code`,true,(`root`.`indicator_id` = 5)) AS `oicr_internal_code`,`report_field`(`ro`.`outcome_impact_statement`,true,(`root`.`indicator_id` = 5)) AS `outcome_impact_statement`,`report_field`(`ro`.`short_outcome_impact_statement`,true,(`root`.`indicator_id` = 5)) AS `short_outcome_impact_statement`,`report_field`(`ro`.`sharepoint_link`,false,(`root`.`indicator_id` = 5)) AS `sharepoint_link`,`report_field`(concat_ws('',`aus`.`first_name`,' ',`aus`.`last_name`),true,(`root`.`indicator_id` = 5)) AS `mel_regional_expert`,`report_field`(`rt`.`tag_name`,true,(`root`.`indicator_id` = 5)) AS `tagging`,`report_field`(`rq`.`quantifications`,false,(`root`.`indicator_id` = 5)) AS `quantifications`,`report_field`(`rq2`.`extrapolated_estimates`,false,(`root`.`indicator_id` = 5)) AS `extrapolated_estimates`,`report_field`(`acp`.`authors_contact_persons`,false,(`root`.`indicator_id` = 5)) AS `authors_contact_persons`,`report_field`(if(`ro`.`for_external_use`,'YES','NO'),false,(`root`.`indicator_id` = 5)) AS `for_external_use`,`report_field`(`ro`.`for_external_use_description`,false,(`root`.`indicator_id` = 5)) AS `for_external_use_description`,`report_field`(`ria`.`impact_area`,true,(`root`.`indicator_id` = 5)) AS `impact_area`,`report_field`(`treo`.`existing_oicr`,true,((`root`.`indicator_id` = 5) and (`rt`.`tag_id` in (2,3)) and (`rt`.`tag_id` is not null))) AS `existing_oicr`,`report_field`(`ro`.`cgspace_link`,true,(`root`.`indicator_id` = 5)) AS `cgspace_link` from ((((((((((`results` `root` left join `result_oicrs` `ro` on((`ro`.`result_id` = `root`.`result_id`))) left join `maturity_levels` `ml` on((`ml`.`id` = `ro`.`maturity_level_id`))) left join `alliance_user_staff_groups` `ausg` on(((`ausg`.`staff_group_id` = `ro`.`mel_staff_group_id`) and (`ausg`.`carnet` = `ro`.`mel_regional_expert`)))) left join `alliance_user_staff` `aus` on((`aus`.`carnet` = `ausg`.`carnet`))) left join (select `rt`.`result_id` AS `result_id`,`rt`.`tag_id` AS `tag_id`,`t`.`name` AS `tag_name` from (`result_tags` `rt` join `tags` `t` on((`t`.`id` = `rt`.`tag_id`))) where (`rt`.`is_active` = true) group by `rt`.`result_id` order by `rt`.`result_id`) `rt` on((`rt`.`result_id` = `root`.`result_id`))) left join (select `rq`.`result_id` AS `result_id`,group_concat(concat_ws('','• Number: ',`report_field`(`rq`.`quantification_number`,true,true),', Unit: ',`report_field`(`rq`.`unit`,true,true),', Comment: ',`report_field`(`rq`.`description`,true,true)) separator '\n') AS `quantifications` from `result_quantifications` `rq` where ((`rq`.`is_active` = true) and (`rq`.`quantification_role_id` = 1)) group by `rq`.`result_id`) `rq` on((`rq`.`result_id` = `root`.`result_id`))) left join (select `rq`.`result_id` AS `result_id`,group_concat(concat_ws('','• Number: ',`report_field`(`rq`.`quantification_number`,true,true),', Unit: ',`report_field`(`rq`.`unit`,true,true),', Comment: ',`report_field`(`rq`.`description`,true,true)) separator '\n') AS `extrapolated_estimates` from `result_quantifications` `rq` where ((`rq`.`is_active` = true) and (`rq`.`quantification_role_id` = 2)) group by `rq`.`result_id`) `rq2` on((`rq2`.`result_id` = `root`.`result_id`))) left join (select `ru`.`result_id` AS `result_id`,group_concat(concat_ws('','• ',`aus`.`first_name`,' ',`aus`.`last_name`,' - Position: ',ifnull(`aus`.`position`,'N/D'),' - Affiliation: ',ifnull(`aus`.`center`,'N/D')) separator '\n') AS `authors_contact_persons` from (`result_users` `ru` join `alliance_user_staff` `aus` on((`aus`.`carnet` = `ru`.`user_id`))) where ((`ru`.`user_role_id` = 3) and (`ru`.`is_active` = true)) group by `ru`.`result_id`) `acp` on((`acp`.`result_id` = `root`.`result_id`))) left join (select `ria`.`result_id` AS `result_id`,group_concat('• ',`cia`.`name`,' - Score: ',convert(`report_field`(concat('(',(`ias`.`id` - 1),') ',`ias`.`name`),true,true) using utf8mb3),'\n',`rgt`.`global_targets` separator '\n') AS `impact_area` from (((`result_impact_areas` `ria` left join `clarisa_impact_areas` `cia` on((`cia`.`id` = `ria`.`impact_area_id`))) left join `impact_area_scores` `ias` on((`ias`.`id` = `ria`.`impact_area_score_id`))) left join (select `riagt`.`result_impact_area_id` AS `result_impact_area_id`,group_concat('	◦ ',`cgt`.`smo_code`,' - ',`cgt`.`target` separator '\n') AS `global_targets` from (`result_impact_area_global_target` `riagt` left join `clarisa_global_targets` `cgt` on((`cgt`.`targetId` = `riagt`.`global_target_id`))) where (`riagt`.`is_active` = true) group by `riagt`.`result_impact_area_id`) `rgt` on((`rgt`.`result_impact_area_id` = `ria`.`id`))) where (`ria`.`is_active` = true) group by `ria`.`result_id`) `ria` on((`ria`.`result_id` = `root`.`result_id`))) left join (select `treo`.`result_id` AS `result_id`,concat(`teo`.`external_id`,' - ',`teo`.`title`,' <',`teo`.`handle_link`,'>') AS `existing_oicr` from (`TEMP_result_external_oicrs` `treo` join `TEMP_external_oicrs` `teo` on((`teo`.`id` = `treo`.`external_oicr_id`))) where (`treo`.`is_active` = true) group by `treo`.`result_id`) `treo` on((`treo`.`result_id` = `root`.`result_id`))) where ((`root`.`is_active` = true) and (`root`.`is_snapshot` = false)) order by `root`.`result_id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `report_partners`
--

/*!50001 DROP VIEW IF EXISTS `report_partners`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `report_partners` AS select `root`.`result_id` AS `result_id`,`report_field`(`pr`.`partners`,true,(0 = `root`.`is_partner_not_applicable`)) AS `partners` from (`results` `root` left join (select `ri`.`result_id` AS `result_id`,group_concat(concat_ws('','• ','[id: ',`ci`.`code`,'] ',`ci`.`acronym`,' - (HQ:',`cil`.`name`,') ',`ci`.`name`) separator '\n') AS `partners` from ((`result_institutions` `ri` join `clarisa_institutions` `ci` on((`ci`.`code` = `ri`.`institution_id`))) left join `clarisa_institution_locations` `cil` on(((`cil`.`institution_id` = `ci`.`code`) and (`cil`.`isHeadquarter` = true)))) where ((`ri`.`is_active` = true) and (`ri`.`institution_role_id` = 3)) group by `ri`.`result_id`) `pr` on((`pr`.`result_id` = `root`.`result_id`))) where ((`root`.`is_active` = true) and (`root`.`is_snapshot` = false)) order by `root`.`result_id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `report_policy_change`
--

/*!50001 DROP VIEW IF EXISTS `report_policy_change`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_520_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `report_policy_change` AS select `root`.`result_id` AS `result_id`,`report_field`(`rpc`.`evidence_stage`,true,(`root`.`indicator_id` = 4)) AS `evidence_stage`,`report_field`(`pt`.`name`,true,(`root`.`indicator_id` = 4)) AS `policy_type`,`report_field`(`ps`.`name`,true,(`root`.`indicator_id` = 4)) AS `policy_stage`,`report_field`(`ri2`.`implementing_organizations`,true,(`root`.`indicator_id` = 4)) AS `implementing_organizations` from ((((`results` `root` left join `result_policy_change` `rpc` on((`rpc`.`result_id` = `root`.`result_id`))) left join `policy_types` `pt` on((`pt`.`policy_type_id` = `rpc`.`policy_type_id`))) left join `policy_stage` `ps` on((`ps`.`policy_stage_id` = `rpc`.`policy_stage_id`))) left join (select `ri`.`result_id` AS `result_id`,group_concat(concat_ws('','• ','[id: ',`ci`.`code`,'] ',`ci`.`acronym`,' - (HQ:',`cil`.`name`,') ',`ci`.`name`) separator '\n') AS `implementing_organizations` from ((`result_institutions` `ri` join `clarisa_institutions` `ci` on((`ci`.`code` = `ri`.`institution_id`))) left join `clarisa_institution_locations` `cil` on(((`cil`.`institution_id` = `ci`.`code`) and (`cil`.`isHeadquarter` = true)))) where (`ri`.`institution_role_id` = 4) group by `ri`.`result_id`) `ri2` on((`ri2`.`result_id` = `root`.`result_id`))) where ((`root`.`is_active` = true) and (`root`.`is_snapshot` = false)) order by `root`.`result_id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_results_dashboard_cap_sharing`
--

/*!50001 DROP VIEW IF EXISTS `vw_results_dashboard_cap_sharing`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `vw_results_dashboard_cap_sharing` AS select `r`.`result_id` AS `result_id`,`r`.`result_official_code` AS `result_official_code`,`rcs`.`session_participants_male` AS `session_participants_male`,`rcs`.`session_participants_female` AS `session_participants_female`,`rcs`.`session_participants_non_binary` AS `session_participants_non_binary`,`dm`.`delivery_modality_id` AS `delivery_metod_id`,`dm`.`name` AS `delivery_metod`,`sl`.`session_length_id` AS `term_id`,`sl`.`name` AS `term` from (((`results` `r` join `result_capacity_sharing` `rcs` on((`rcs`.`result_id` = `r`.`result_id`))) join `delivery_modalities` `dm` on((`dm`.`delivery_modality_id` = `rcs`.`delivery_modality_id`))) join `session_lengths` `sl` on((`sl`.`session_length_id` = `rcs`.`session_length_id`))) where ((`r`.`is_active` = 1) and (`r`.`indicator_id` in (1,4)) and (((`r`.`is_snapshot` = 1) and (`r`.`result_status_id` = 6)) or ((`r`.`result_status_id` <> 6) and (`r`.`is_snapshot` = 0)))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_results_dashboard_countries`
--

/*!50001 DROP VIEW IF EXISTS `vw_results_dashboard_countries`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `vw_results_dashboard_countries` AS select `r`.`result_id` AS `result_id`,`r`.`result_official_code` AS `result_official_code`,`cc`.`name` AS `country_name`,`cc`.`isoAlpha2` AS `isoAlpha2`,`cc`.`isoAlpha3` AS `isoAlpha3`,`cc`.`longitude` AS `longitude`,`cc`.`latitude` AS `latitude`,NULL AS `region_un_name` from ((`results` `r` join `result_countries` `rc` on((`rc`.`result_id` = `r`.`result_id`))) join `clarisa_countries` `cc` on((`cc`.`isoAlpha2` = `rc`.`isoAlpha2`))) where ((`r`.`is_active` = 1) and (`r`.`indicator_id` in (1,4)) and (((`r`.`is_snapshot` = 1) and (`r`.`result_status_id` = 6)) or ((`r`.`result_status_id` <> 6) and (`r`.`is_snapshot` = 0)))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_results_dashboard_policies`
--

/*!50001 DROP VIEW IF EXISTS `vw_results_dashboard_policies`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `vw_results_dashboard_policies` AS select `r`.`result_id` AS `result_id`,`r`.`result_official_code` AS `result_official_code`,`ps`.`policy_stage_id` AS `policy_stage_id`,`ps`.`description` AS `policy_stage`,`pt`.`policy_type_id` AS `policy_type_id`,`pt`.`name` AS `policy_type` from (((`results` `r` join `result_policy_change` `rpc` on((`rpc`.`result_id` = `r`.`result_id`))) join `policy_stage` `ps` on((`ps`.`policy_stage_id` = `rpc`.`policy_stage_id`))) join `policy_types` `pt` on((`pt`.`policy_type_id` = `rpc`.`policy_type_id`))) where ((`r`.`is_active` = 1) and (`r`.`indicator_id` in (1,4)) and (((`r`.`is_snapshot` = 1) and (`r`.`result_status_id` = 6)) or ((`r`.`result_status_id` <> 6) and (`r`.`is_snapshot` = 0)))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_results_dashboard_regions`
--

/*!50001 DROP VIEW IF EXISTS `vw_results_dashboard_regions`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `vw_results_dashboard_regions` AS select `r`.`result_id` AS `result_id`,`r`.`result_official_code` AS `result_official_code`,`cr`.`name` AS `name`,NULL AS `CGIAR_acronym`,NULL AS `CGIAR_region` from ((`results` `r` join `result_regions` `rr` on((`rr`.`result_id` = `r`.`result_id`))) join `clarisa_regions` `cr` on((`cr`.`um49Code` = `rr`.`region_id`))) where ((`r`.`is_active` = 1) and (`r`.`indicator_id` in (1,4)) and (((`r`.`is_snapshot` = 1) and (`r`.`result_status_id` = 6)) or ((`r`.`result_status_id` <> 6) and (`r`.`is_snapshot` = 0)))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_results_dashboard_results`
--

/*!50001 DROP VIEW IF EXISTS `vw_results_dashboard_results`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `vw_results_dashboard_results` AS select `r`.`result_id` AS `result_id`,`r`.`result_official_code` AS `result_official_code`,`r`.`title` AS `title`,`r`.`report_year_id` AS `report_year_id`,group_concat(`cgs`.`name` separator ',') AS `Geographic_scope`,`it`.`name` AS `result_type`,NULL AS `pdf` from (((`results` `r` join `report_years` `ry` on((`r`.`report_year_id` = `ry`.`report_year`))) join `indicator_types` `it` on((`it`.`indicator_type_id` = `r`.`indicator_id`))) join `clarisa_geo_scope` `cgs` on((`cgs`.`code` = `r`.`geo_scope_id`))) where ((`r`.`is_active` = 1) and (`r`.`indicator_id` in (1,4)) and (((`r`.`is_snapshot` = 1) and (`r`.`result_status_id` = 6)) or ((`r`.`result_status_id` <> 6) and (`r`.`is_snapshot` = 0)))) group by `r`.`result_id` order by `r`.`tip_id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_results_dashboard_sdgs`
--

/*!50001 DROP VIEW IF EXISTS `vw_results_dashboard_sdgs`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `vw_results_dashboard_sdgs` AS select `r`.`result_id` AS `result_id`,`r`.`result_official_code` AS `result_official_code`,`cs`.`short_name` AS `short_name`,NULL AS `goal`,NULL AS `target` from ((`results` `r` join `result_sdgs` `rs` on((`rs`.`result_id` = `r`.`result_id`))) join `clarisa_sdgs` `cs` on((`cs`.`id` = `rs`.`clarisa_sdg_id`))) where ((`r`.`is_active` = 1) and (`r`.`indicator_id` in (1,4)) and (((`r`.`is_snapshot` = 1) and (`r`.`result_status_id` = 6)) or ((`r`.`result_status_id` <> 6) and (`r`.`is_snapshot` = 0)))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-14 19:59:31

--
-- SNAPSHOT NOTE: schema pass above (all base tables + views + routines, --no-data)
-- followed by the `migrations` table's ROWS ONLY below — the one deliberate
-- data exception (bookkeeping, not business data). See src/db/baseline/README.md.
--

-- MySQL dump 10.13  Distrib 8.0.46, for Linux (aarch64)
--
-- Host: 192.168.20.210    Database: alliancereportingdb
-- ------------------------------------------------------
-- Server version	8.0.45-0ubuntu0.22.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` (`id`, `timestamp`, `name`) VALUES (1,1722609316360,'CreateAgressoContractTables1722609316360'),(2,1724872525861,'CreateUserContract1724872525861'),(3,1724874632877,'UpdatedUserContractAuditableEntity1724874632877'),(4,1726504510058,'CreatedResultEntities1726504510058'),(5,1726506224435,'RefactorResultContract1726506224435'),(6,1726514742284,'InsertContractRoles1726514742284'),(7,1726841140836,'CreationCapacitySharingEntities1726841140836'),(8,1727119632564,'InsertDataControl1727119632564'),(9,1727207856798,'CreateIndicatorTypes1727207856798'),(10,1727208057174,'InsertIndicators1727208057174'),(11,1727394406550,'RefactorNullableOptions1727394406550'),(12,1727731828208,'InsertUserRoles1727731828208'),(13,1727882877964,'RefactorCapDevColumns1727882877964'),(14,1727884895618,'CreateInstitutionsRoles1727884895618'),(15,1727885569339,'CreateCountriesRoles1727885569339'),(16,1727885628018,'InsertInstitutionRoles1727885628018'),(17,1727896579961,'InsertTrainingSupervisor1727896579961'),(18,1727897719890,'CreateLanguageRoles1727897719890'),(19,1727984831819,'AddedTotalOfParticipants1727984831819'),(20,1728055284536,'RefactorEvidences1728055284536'),(21,1729116774732,'RefactorClarisaLevers1729116774732'),(22,1729174028390,'AddedDescriptionColumnIndicators1729174028390'),(23,1718660991456,'CreateDataBase1718660991456'),(24,1718984424458,'CreateEndpointPermissions1718984424458'),(25,1719330598358,'InsertApplicationRole1719330598358'),(26,1723135730087,'UpdateDatamodelAuthorization1723135730087'),(27,1723150168934,'RefactorEntityTypes1723150168934'),(28,1723151823753,'CreateFKElementType1723151823753'),(29,1723156941410,'CreateCRUDXColumn1723156941410'),(30,1723495300707,'CreateUserRoleContratResults1723495300707'),(31,1724188594287,'OnDeleteConfiguration1724188594287'),(32,1724188959974,'OnDeleteConfigurationParent1724188959974'),(33,1724269535672,'CreateTemplateTable1724269535672'),(34,1729521083010,'AddedLongDescriptionColumnIndicators1729521083010'),(35,1729523098902,'AddedStatusUser1729523098902'),(36,1729611300485,'AddedDescriptionAndIconToIndicators1729611300485'),(37,1729694944900,'InsertSecodaryRoleContractLevers1729694944900'),(38,1729696310294,'AddedIsPrimaryColumn1729696310294'),(39,1729804773129,'TypeTextWereModifiedAgressoContract1729804773129'),(40,1729805135624,'TypeDecimalWereModifiedAgressoContract1729805135624'),(41,1729805961620,'TypeTimestampWereModifiedAgressoContract1729805961620'),(42,1729864456157,'AddedOtherNamesIndicators1729864456157'),(43,1730383191365,'AddedHqInstitutions1730383191365'),(44,1730498145117,'WasModifyPrimaryKeyClarisaCountries1730498145117'),(45,1730498549571,'AddedcontryFK1730498549571'),(46,1730502070300,'UpdateDetailIndicators1730502070300'),(47,1730900555793,'AddedPolicyChangeDataModel1730900555793'),(48,1730993015550,'InsertLinkResultRole1730993015550'),(49,1730995784222,'InsertInstitutionRole1730995784222'),(50,1731419370218,'AddedOtherNameLevers1731419370218'),(51,1731437701566,'InsertDeliveryModality1731437701566'),(52,1731441738756,'UpdateSessionFormatControlList1731441738756'),(53,1731596703634,'ResultStatusTableCreated1731596703634'),(54,1731597217681,'SetDefaultResultStatus1731597217681'),(55,1731616750326,'CreatedAllianceUserStaff1731616750326'),(56,1732023678699,'AddedDeleteAtColumn1732023678699'),(57,1732653590366,'ChangeNullableToTrue1732653590366'),(58,1732632680179,'InsertNewRole1732632680179'),(59,1732724129013,'RefactorRolesTables1732724129013'),(60,1732810381156,'CreateReportYearTable1732810381156'),(61,1732823878957,'SetFktoClarisaSubNationals1732823878957'),(62,1732825474107,'AddedOtherNamesClarisaSubNational1732825474107'),(63,1732826612497,'ChangeTypeOfOtherName1732826612497'),(64,1732915431834,'AddedNewCountryRole1732915431834'),(65,1733239265272,'InsertGeoScope501733239265272'),(66,1733928453454,'AddedNewColumnsAllianceStaff1733928453454'),(67,1733949713725,'SetNullEmailUserStaff1733949713725'),(68,1734102363337,'InsertAcceptedResultStatus1734102363337'),(69,1736800169056,'UpdateSessionLengthsNames1736800169056'),(70,1738616564305,'CreateAnnouncementTable1738616564305'),(71,1738851407067,'CreateDeveloperRole1738851407067'),(72,1740067672790,'CreateSubmmissionHistory1740067672790'),(73,1740497884580,'RefactorSubmmissionHistory1740497884580'),(74,1741727029071,'UpdateResultStatus1741727029071'),(75,1741783422528,'UpdateDefaultStatus1741783422528'),(76,1742332448883,'UpdateDataModel1742332448883'),(77,1743459951186,'UpdatedAuditableentitie1743459951186'),(78,1743459642528,'CreateTempResultAiT1743459642528'),(79,1744381163883,'CreateIpTables1744381163883'),(80,1744381483563,'InsertIpOwners1744381483563'),(81,1744385171102,'AddedFKCapIpToResult1744385171102'),(82,1744387517869,'AddedpotentialAssetToCapIp1744387517869'),(83,1745523942624,'InsertAnnouncement1745523942624'),(84,1744388857345,'InsertIpData1744388857345'),(85,1745526238580,'UpdateIndicatorsNames1745526238580'),(86,1746463749239,'AddedIsSnapshotResult1746463749239'),(87,1746543142767,'AddedIsAiResult1746543142767'),(88,1747230257392,'AddedIsPrivateEvidences1747230257392'),(89,1747954141641,'AddedIPdescriptions1747954141641'),(90,1749600312958,'UpdateIndicatorIcons1749600312958'),(91,1749603152180,'CreateResultInnovationDevTable1749603152180'),(92,1749604157074,'CreateClarisaInnovationReadinessLevel1749604157074'),(93,1749670229224,'CreateClarisaInnovationControlist1749670229224'),(94,1749763135881,'AddnoSexAgeDisaggregationIntoInnoDev1749763135881'),(95,1749772701046,'CreateAnticipatedUser1749772701046'),(96,1749957832239,'CreateEntitiesForInnovationDev1749957832239'),(97,1749965559755,'AddInstitutionTypeRole1749965559755'),(98,1749966409521,'AddActorRole1749966409521'),(99,1750220319664,'UpdateInstitutionsAndActors1750220319664'),(100,1751474908040,'InsertTemplates1751474908040'),(101,1751849010757,'CreateIssueCategories1751849010757'),(102,1751990093334,'AddSdgTable1751990093334'),(103,1752020144703,'AddResultSdgTable1752020144703'),(104,1752097721168,'AddAppConfigTable1752097721168'),(106,1752542014680,'AddNewFieldsInnovationDev1752542014680'),(107,1752622615605,'AddNewFieldsInnovationDev1752622615605'),(108,1753114865119,'AddNewFieldsipRights1753114865119'),(109,1753303310598,'UpdateIndicators1753303310598'),(110,1753460254629,'CreateFunctions1753460254629'),(111,1753813492281,'AddsecretTable1753813492281'),(112,1753816949630,'AddResponsibleUser1753816949630'),(113,1753825641651,'AddUpdateUserId1753825641651'),(114,1753907859101,'UpdateInnovationDev1753907859101'),(115,1753992795699,'UpdateFunctions1753992795699'),(116,1754060908835,'UpdateResultInstitutionType1754060908835'),(117,1754341867460,'UpdateInnovationDevValidation1754341867460'),(118,1754617970505,'CreateUserSettings1754617970505'),(119,1754618477017,'STARmvpProjectIndicators1754618477017'),(120,1754662943589,'STARmvpProjectIndicatorsStructure1754662943589'),(121,1754918393274,'STARmvpGroupsItems1754918393274'),(122,1754928749037,'STARmvpIndicatorsPerItem1754928749037'),(123,1754950528057,'STARmvpIndicatorsPerItemAuditableEntities1754950528057'),(124,1755095772768,'STARmvpResultsIndicators1755095772768'),(125,1755617711035,'STARmvpContributionValue1755617711035'),(126,1755703296588,'CreateOicrs1755703296588'),(127,1755712244158,'OpdateFkOicrsResults1755712244158'),(128,1755787944408,'UpdateDeletefunction1755787944408'),(129,1755789056936,'STARmvpCreateNameGroup1755789056936'),(130,1755809506780,'SetNullableGeneralComments1755809506780'),(131,1756143877136,'CreatedOicrTemplate1756143877136'),(132,1756153740257,'STARmvpGroupsNames1756153740257'),(133,1756224758843,'CreateReportingPlatform1756224758843'),(134,1756227741535,'UpdateReportingPlatform1756227741535'),(135,1756389433866,'STARmvpCustomFields1756389433866'),(136,1756506829675,'CreateTempResultOicr1756506829675'),(137,1756508231391,'UpdateTempResultOicr1756508231391'),(138,1756695342816,'UpdateBanner1756695342816'),(139,1756827484385,'UpdateResults1756827484385'),(140,1756844967667,'UpdatePartnerGreen1756844967667'),(141,1757003694835,'STARmvpUniqueIndex1757003694835'),(142,1757437130725,'UpdateTempExteranlOicr1757437130725'),(143,1757450312807,'AddLeverRoleAligmentOicr1757450312807'),(144,1757605572080,'InsertNewRole1757605572080'),(145,1757696481084,'CreatAiTransactionalTables1757696481084'),(146,1757865144093,'UpdateDeleteFunctions1757865144093'),(147,1758035765432,'InnovationReadinessExplanation1758035765432'),(148,1758039230848,'AddInnovationReadinessExplanationCheck1758039230848'),(149,1758050480166,'AddInnovationReadinessExplanationCheckValidText1758050480166'),(150,1758040476633,'UpdateTempExternalOicr1758040476633'),(151,1758054920860,'CorrectValidTextFunction1758054920860'),(152,1758056412592,'UpdateResultCapSharing1758056412592'),(153,1758071727988,'ToolFunctionIntermediateTable1758071727988'),(154,1758072861646,'ResultInnovationToolFunctionRelationManyToMany1758072861646'),(155,1758125999162,'AdaptInnovationDevValidationToManyToolFunctions1758125999162'),(156,1758207759615,'InsertNewResultStatus1758207759615'),(157,1758213806118,'UpdateOicrTemplate1758213806118'),(158,1758224061959,'UpdateResultOicr1758224061959'),(159,1758292242370,'InnovationReadinessAdditionalGuidance1758292242370'),(160,1758510659334,'UpdateTemplateHyperLink1758510659334'),(161,1758556436328,'FixAdditionalGuidanceCaseElse1758556436328'),(162,1758578092512,'UpdateTemplateAccesToOICR1758578092512'),(163,1758659752184,'UpdateDeleteFunctions1758659752184'),(164,1758832863133,'UpdateVersioning1758832863133'),(165,1759153391036,'UpdateAgressoContracts1759153391036'),(166,1759251711763,'UpdateIndicators1759251711763'),(167,1759265784578,'UpdateIndicatorsOicr1759265784578'),(168,1759786024597,'CreateStaffGroups1759786024597'),(169,1759847190782,'UpdateResultOicrMelExpert1759847190782'),(170,1759849549016,'InsertNewStatusOicr1759849549016'),(171,1759937879517,'InsertNewStatusOicrPostpone1759937879517'),(172,1759951810292,'InsertOicrTemplates1759951810292'),(173,1760470936688,'AddedLastLoginAt1760470936688'),(175,1760533918462,'CreatFullDelete1760533918462'),(176,1760543753382,'CreateNewTablesLevers1760543753382'),(177,1760631612967,'UpdateGreenAlignment1760631612967'),(178,1760653582914,'CreateQuantificationTables1760653582914'),(179,1760656429681,'CreateNotableReferenceTables1760656429681'),(180,1760712418098,'UpdateOicrTemplate1760712418098'),(181,1760713349516,'UpdateNullableControlList1760713349516'),(182,1760728368286,'CreateInformativeRoles1760728368286'),(183,1760834339667,'CreateImpactArea1760834339667'),(184,1761054852156,'CreateGlobalTargets1761054852156'),(185,1761062590229,'CreateResultImpactAreaGloablTarget1761062590229'),(186,1761074373916,'UpdateResultImpactArea1761074373916'),(187,1761083173145,'CreateOicrValidation1761083173145'),(188,1761148466809,'UpdateFunctionsOicrs1761148466809'),(189,1761840859164,'UpdateDeleteFunction1761840859164'),(190,1761845073143,'UpdateVersioning1761845073143'),(191,1762350410461,'SessionLengths1762350410461'),(192,1762352955252,'UpdateTemplate1762352955252'),(193,1763044324855,'UpdateInformativeRole1763044324855'),(194,1763587336968,'InsertExternalLinkColumn1763587336968'),(195,1763649577865,'UpdateGreenOicrEvidence1763649577865'),(196,1763671794160,'CreateLinkResultValidation1763671794160'),(197,1763739726901,'CreateResultStatusTransitionTable1763739726901'),(198,1763742217584,'InsertResultStatusTransition1763742217584'),(199,1764186099439,'UpdateSecUsers1764186099439'),(200,1764193570350,'CreateResultKp1764193570350'),(201,1764275660631,'UpdateDeleteFunctions1764275660631'),(202,1764341123340,'CreatePooledfundingTable1764341123340'),(203,1764341373651,'CreatePooledfundingTable1764341373651'),(204,1764344449766,'UpdatePooledFunding1764344449766'),(205,1764604544921,'InactivePartners1764604544921'),(206,1764773160868,'UpdateStatusNameRevised1764773160868'),(207,1764804642820,'UpdateStatusNameRejected1764804642820'),(208,1767796719645,'CreatStatusWorkFlow1767796719645'),(209,1767799599961,'AddedIsEditableResultStatus1767799599961'),(210,1767818860472,'UpdateConfigResultStatus1767818860472'),(211,1767821369314,'InsertAndUpdateNewStatus1767821369314'),(212,1767896904041,'UpdateResultStatusWorkflowConfig1767896904041'),(214,1767904959663,'UpdateColorsStatus1767904959663'),(215,1767901590080,'InsertStatusWorkflow1767901590080'),(216,1768329933286,'UpdateConfigWorkflow1768329933286'),(217,1768330211990,'UpdateTemplates1768330211990'),(218,1768332927495,'UpdateResultStatusId1768332927495'),(219,1768333964044,'UpdateStatusHistory1768333964044'),(220,1768337872380,'UpdateConfigurationsWorkflow1768337872380'),(221,1768399801819,'AddActionDescriptionStatus1768399801819'),(222,1768423912564,'AddNewWorkflow1768423912564'),(223,1768497279299,'AddConfigAcceptedOicr1768497279299'),(224,1768504983827,'UpdateOicrAcceptedTemplate1768504983827'),(225,1768506174155,'AddConfigPostponeOicr1768506174155'),(226,1768507069767,'AddConfigNoAcceptedOicr1768507069767'),(227,1768508920651,'AddConfigRequestOicr1768508920651'),(228,1768573722571,'InsertNewWorkflow1768573722571'),(229,1768576733813,'UpdateSpVersioning1768576733813'),(230,1768578051719,'UpdateNotAcceptedConfig1768578051719'),(231,1768592057811,'InsertNewTamplate1768592057811'),(232,1768594523277,'UpdateWorkFlowDirectlyApproved1768594523277'),(233,1768600804146,'AddedNewColumnResult1768600804146'),(234,1768686422183,'UpdatePublicLinkColumnResult1768686422183'),(235,1769536751195,'UpdateTemplates1769536751195'),(236,1770912725506,'AlterCharsetResultDescription1770912725506'),(237,1771862925675,'UpdatePartnersGC1771862925675'),(238,1771967548961,'CreateSyncLogs1771967548961'),(239,1771968545706,'UpdateSyncLogs1771968545706'),(240,1772136672518,'UpdateStatusHistory1772136672518'),(241,1772141086603,'MigrationOldHistory1772141086603'),(242,1772481692172,'InsertNewTemplateInnovationLevel1772481692172'),(243,1772553395986,'AddedIsEditableDate1772553395986'),(244,1772567839059,'InsertDateConfig1772567839059'),(245,1773243981583,'UpdateInformativeRoles1773243981583'),(246,1774034272174,'CreateIndexResults1774034272174'),(247,1774366474408,'AddedCategoryAppData1774366474408'),(248,1774370334667,'AddedFieldAppData1774370334667'),(249,1774373269393,'IncreaseAppConfigKeyLengthTo2551774373269393'),(250,1774388978023,'UpdateWorkFlow1774388978023'),(251,1775753815699,'CreateSdgTables1775753815699'),(252,1775758882363,'InsertLeverSdgTarget1775758882363'),(253,1775766147426,'CreateResultLeverSdg1775766147426'),(254,1775766409533,'SetFkLeverSdg1775766409533'),(255,1775771205535,'UpdateGreenAlignment1775771205535'),(256,1775827676473,'AddedSdgIdSdgTarget1775827676473'),(257,1775833322205,'AddedPositionStaff1775833322205'),(258,1775848762528,'UpdateGreenAlignmentSdg1775848762528'),(259,1775850475192,'UpdateLinkTip1775850475192'),(260,1776373605381,'UpdateValidText1776373605381'),(261,1776433682077,'InsertNewRoles1776433682077'),(262,1776443271722,'UpdateRoleTable1776443271722'),(263,1777025000000,'CreateReportWorkbookTables1777025000000'),(264,1777026000000,'ReportSectionColorsAndColumnGroups1777026000000'),(265,1777026100000,'FixStarRawColumnGroupsEvidences1777026100000'),(266,1776874787128,'CreateSectionViews1776874787128'),(267,1777046263538,'UpdateDateFormat1777046263538'),(268,1777303378814,'UpdateSPVersioning1777303378814'),(269,1777495288671,'UpdateRolesInfo1777495288671'),(270,1777905058240,'UpdateAlignmentValidation1777905058240'),(271,1778078328257,'UpdateDbEnv1778078328257'),(272,1778160651143,'AddednewUserStatus1778160651143'),(273,1778510205765,'Updatefulldelete1778510205765'),(276,1779190000001,'AddPoolFundingContributorTagToAgressoContract1779190000001'),(277,1779190000002,'AddIsSyncedToPrmsAndPrmsResultCodeToResults1779190000002'),(281,1779190000003,'AddBilateralResultStatuses1779190000003'),(282,1779190000004,'AddBilateralResultStatusWorkflow1779190000004'),(283,1779190000005,'AddReportingPlatformBilateral1779190000005'),(288,1779190000006,'CreateResultPoolFundingAlignment1779190000006'),(289,1779190000007,'CreateResultPoolFundingAlignmentSp1779190000007'),(290,1779190000008,'CreateResultPoolFundingIndicatorMapping1779190000008'),(291,1779190000009,'CreateResultReviewHistory1779190000009'),(292,1779396908993,'UpdateCapSharingDateType1779396908993'),(293,1779190000010,'CreateClarisaSciencePrograms1779190000010'),(294,1779723460547,'ReportCapSharingDateView1779723460547'),(295,1779730000000,'StarRawCapsharingColumnGroup1779730000000'),(296,1779746894326,'ReportPolicyView1779746894326'),(297,1779750000000,'StarRawPolicyColumnGroup1779750000000'),(299,1779190000011,'CreateBilateralProjectMapping1779190000011'),(301,1779190000012,'AddIconKeyToScienceProgram1779190000012'),(303,1779190000013,'RenameLeverCodeToSpCodeOnAlignmentSp1779190000013'),(304,1779190000014,'FixResultPoolFundingAlignmentPartialUnique1779190000014'),(305,1779903441021,'ReportOICRView1779903441021'),(306,1779910000000,'StarRawOicrColumnGroup1779910000000'),(307,1779920000000,'ExpandReportFieldMediumtext1779920000000'),(308,1780074063394,'AddedCGSpaceLink1780074063394'),(309,1780331976405,'AddedValidationColumn1780331976405'),(310,1780342254980,'AddedValidationGreenFunction1780342254980'),(311,1780519377343,'UpdateOicrGreen1780519377343'),(312,1780590538118,'UpdateOICRview1780590538118'),(313,1780672573009,'UpdateOicrLinkResult1780672573009'),(314,1780688964262,'CreateLinkResultView1780688964262'),(315,1780690000000,'StarRawLinkResultColumnGroup1780690000000'),(316,1780694172676,'UpdateReportView1780694172676'),(317,1780695000000,'StarRawOicrCgspaceColumnGroup1780695000000'),(319,1779190000015,'CreateResultPoolFundingTocAlignment1779190000015'),(320,1781101247756,'CreateIaReportSchema1781101247756'),(321,1781106535639,'AddedErrorMessageAiReport1781106535639'),(322,1781108426249,'AddedMetadataFieldsAiReport1781108426249'),(323,1781122590421,'AddedFkStatusAiReport1781122590421'),(324,1781210173864,'ActiveAllDictionaryData1781210173864'),(325,1781214360181,'UpdateEvidenceSection1781214360181'),(326,1781215000000,'StarRawNotableReferencesColumnGroup1781215000000'),(327,1781216000000,'StarRawSheetOrderFirst1781216000000'),(328,1781300000000,'CreateReportInnovationDevView1781300000000'),(329,1781301000000,'StarRawInnovationDevColumnGroup1781301000000'),(330,1781879906673,'AddNewEnvCl1781879906673'),(331,1782230886769,'AddOtherLever1782230886769'),(332,1782232087461,'AddCustomLeverNameInResultLever1782232087461'),(333,1782234310249,'UpdateAligmentValidation1782234310249'),(334,1782234954194,'UpdateSpVersion1782234954194'),(335,1782328490591,'CreatePlatformsTable1782328490591'),(336,1782337004400,'AddedPortfolioIdClarisaLevers1782337004400'),(337,1782400514019,'CreateStrategicObjectivesTable1782400514019'),(338,1782402733402,'InsertNewResearchAreas1782402733402'),(339,1782418327772,'CreateImpactOutcomesTable1782418327772'),(340,1782486943935,'CreateResultStrategicAndResultOutcomesTables1782486943935'),(341,1782243896432,'UpdateAligmentValidationSdgs1782243896432'),(342,1782827632104,'AddedIconClarisaLever1782827632104'),(343,1782828905259,'InsertIconClarisaLever1782828905259'),(344,1782837076402,'InsertLeverRole1782837076402'),(345,1782915723179,'CreatePRMSTemporalTable1782915723179'),(346,1782950000000,'CreatePoolFundingAlignmentValidationFunction1782950000000'),(347,1783020803759,'CreateGetPortfolioIdFunction1783020803759'),(348,1783021729548,'UpdateAlignmentValidation1783021729548'),(349,1783022620616,'UpdateRoleColumnObjetives1783022620616'),(350,1783024745006,'UpdatePortfolio1Years1783024745006'),(351,1783029013035,'UpdateDeleteAndVersionSp1783029013035'),(352,1783372331331,'CreateSyncStagingRecordsTable1783372331331'),(353,1783520054723,'UpdateResultKp1783520054723'),(354,1784211738931,'AddedTipIdKp1784211738931'),(359,1785866413438,'CompleteFullDeleteResultVersion1785866413438'),(360,1785870729889,'CreateDuplicateResolutionLog1785870729889'),(361,1785870730889,'AddOmittedDuplicateRecordsCounter1785870730889'),(362,1785872085723,'SeedDuplicateResolutionConfig1785872085723'),(363,1786043523207,'AddBulkUploadNotificationMetrics1786043523207'),(364,1786044600000,'InsertCapdevBulkNotificationConfig1786044600000'),(365,1786045516418,'InsertCapdevBulkSummaryTemplate1786045516418'),(366,1786636994078,'AddSpRoleToAlignmentSp1786636994078'),(367,1784500000000,'CorrectPoolFundingAlignmentValidationComment1784500000000'),(368,1786679227000,'ScopePoolFundingValidationToPrimarySp1786679227000');
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-14 19:59:32
