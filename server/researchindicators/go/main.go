package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"time"
	"path/filepath"

	"github.com/xuri/excelize/v2"
)

// Structs para mapear JSON
type Result struct {
	ID                 int    		`json:"result_id"`
	Code               int    		`json:"result_official_code"`
	Title              string 		`json:"title"`
	Description        string 		`json:"description"`
	Contribution_Value interface{} 	`json:"contribution_value"`
}

type Indicator struct {
	ID            	int         `json:"indicator_id"`
	Code          	string      `json:"code"`
	Name          	string      `json:"name"`
	Description   	string      `json:"description"`
	Target_Unit   	string      `json:"target_unit"`
	Number_Type    	string      `json:"number_type"`
	Number_Format  	string      `json:"number_format"`
	Target_Value   	interface{} `json:"target_value"`
	Base_Line      	interface{} `json:"base_line"`
	Year          	[]int       `json:"year"`
	Type          	string      `json:"type"`
	Contributions 	[]Result  	`json:"contributions"`
}

func main() {
	// Leer JSON desde stdin
	input, err := io.ReadAll(os.Stdin)
	if err != nil {
		log.Fatal("Error reading stdin:", err)
	}

	var indicators []Indicator
	if err := json.Unmarshal(input, &indicators); err != nil {
		log.Fatal("Error parsing JSON:", err)
	}

	f := excelize.NewFile()
	defaultSheet := f.GetSheetName(0)
	f.DeleteSheet(defaultSheet)

	for _, indicator := range indicators {
		sheetName := fmt.Sprintf("Indicator_%d", indicator.ID)
		f.NewSheet(sheetName)

		// --- INDICATOR Title ---
		f.MergeCell(sheetName, "A1", "J1")
		f.SetCellValue(sheetName, "A1", "INDICATOR")

		// --- Indicator Headers ---
		indicatorHeaders := []string{
			"Code", "Name", "Description", "Target_Unit",
			"Number_Type", "Number_Format", "Target_Value",
			"Base_Line", "Year", "Type",
		}

		indicatorValues := []interface{}{
			indicator.Code, indicator.Name, indicator.Description, indicator.Target_Unit,
			indicator.Number_Type, indicator.Number_Format, indicator.Target_Value,
			indicator.Base_Line, indicator.Year, indicator.Type,
		}

		// Headers in row 2
		for col, h := range indicatorHeaders {
			cell, _ := excelize.CoordinatesToCellName(col+1, 2)
			f.SetCellValue(sheetName, cell, h)
		}
		// Values in row 3
		for col, v := range indicatorValues {
			cell, _ := excelize.CoordinatesToCellName(col+1, 3)
			f.SetCellValue(sheetName, cell, v)
		}

		// --- RESULT CONTRIBUTIONS Title ---
		f.MergeCell(sheetName, "A6", "D6")
		f.SetCellValue(sheetName, "A6", "RESULT CONTRIBUTIONS")

		// --- Results table ---
		resultHeaders := []string{"Code", "Title", "Description", "Contribution_Value"}
		startRow := 7

		for col, h := range resultHeaders {
			cell, _ := excelize.CoordinatesToCellName(col+1, startRow)
			f.SetCellValue(sheetName, cell, h)
		}

		for row, res := range indicator.Contributions {
			f.SetCellValue(sheetName, fmt.Sprintf("A%d", startRow+row+1), res.Code)
			f.SetCellValue(sheetName, fmt.Sprintf("B%d", startRow+row+1), res.Title)
			f.SetCellValue(sheetName, fmt.Sprintf("C%d", startRow+row+1), res.Description)
			f.SetCellValue(sheetName, fmt.Sprintf("D%d", startRow+row+1), res.Contribution_Value)
		}
	}

	agreementID := "A100"
	dateStr := time.Now().Format("20060102")

	fileName := fmt.Sprintf("%s_indicator_contributions_%s.xlsx", agreementID, dateStr)

	// Guardar archivo en directorio temporal
	outputPath := filepath.Join(os.TempDir(), fileName)
	if err := f.SaveAs(outputPath); err != nil {
		log.Fatal(err)
	}

	fmt.Println(outputPath)
}