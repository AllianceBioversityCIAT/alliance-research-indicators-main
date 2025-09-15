package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"

	"github.com/xuri/excelize/v2"
)

// Structs para mapear JSON
type Resultado struct {
	ID     int    `json:"id"`
	Nombre string `json:"nombre"`
	Valor  int    `json:"valor"`
}

type Indicador struct {
	ID            int         `json:"indicator_id"`
	Code          string      `json:"code"`
	Name          string      `json:"name"`
	Description   string      `json:"description"`
	TargetUnit    string      `json:"target_unit"`
	NumberType    string      `json:"number_type"`
	NumberFormat  string      `json:"number_format"`
	TargetValue   interface{} `json:"target_value"`
	BaseLine      interface{} `json:"base_line"`
	Year          []int         `json:"year"`
	Type          string      `json:"type"`
	Contributions []Resultado `json:"contributions"`
}

func main() {
	// Leer JSON desde stdin
	input, err := io.ReadAll(os.Stdin)
	if err != nil {
		log.Fatal("Error leyendo stdin:", err)
	}

	var indicadores []Indicador
	if err := json.Unmarshal(input, &indicadores); err != nil {
		log.Fatal("Error parseando JSON:", err)
	}

	f := excelize.NewFile()
	defaultSheet := f.GetSheetName(0)
	f.DeleteSheet(defaultSheet)

	for _, indicador := range indicadores {
		sheetName := fmt.Sprintf("Indicador_%d", indicador.ID)
		f.NewSheet(sheetName)

		// --- Sección 1: Datos del indicador ---
		indicatorHeaders := []string{
			"ID", "Code", "Name", "Description",
			"TargetUnit", "NumberType", "NumberFormat",
			"TargetValue", "BaseLine", "Year", "Type",
		}

		indicatorValues := []interface{}{
			indicador.ID, indicador.Code, indicador.Name, indicador.Description,
			indicador.TargetUnit, indicador.NumberType, indicador.NumberFormat,
			indicador.TargetValue, indicador.BaseLine, indicador.Year, indicador.Type,
		}

		// Escribir encabezados y valores en filas 1 y 2
		for col, h := range indicatorHeaders {
			cell, _ := excelize.CoordinatesToCellName(col+1, 1)
			f.SetCellValue(sheetName, cell, h)
		}
		for col, v := range indicatorValues {
			cell, _ := excelize.CoordinatesToCellName(col+1, 2)
			f.SetCellValue(sheetName, cell, v)
		}

		// --- Sección 2: Tabla de resultados ---
		resultHeaders := []string{"ID Resultado", "Nombre", "Valor"}
		startRow := 4 // Saltamos 2 filas + 1 fila en blanco

		for col, h := range resultHeaders {
			cell, _ := excelize.CoordinatesToCellName(col+1, startRow)
			f.SetCellValue(sheetName, cell, h)
		}

		for row, res := range indicador.Contributions {
			f.SetCellValue(sheetName, fmt.Sprintf("A%d", startRow+row+1), res.ID)
			f.SetCellValue(sheetName, fmt.Sprintf("B%d", startRow+row+1), res.Nombre)
			f.SetCellValue(sheetName, fmt.Sprintf("C%d", startRow+row+1), res.Valor)
		}
	}

	// Guardar archivo en temporal
	outputPath := filepath.Join(os.TempDir(), "indicadores.xlsx")
	if err := f.SaveAs(outputPath); err != nil {
		log.Fatal(err)
	}

	fmt.Println(outputPath) // Para que Nest.js capture la ruta
}