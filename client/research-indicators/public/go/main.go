package main

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"
	"strings"
	"syscall/js"
)

// Constants to avoid duplication
const (
	sdtContentTag    = "<w:sdtContent>"
	sdtContentEndTag = "</w:sdtContent>"
	sdtTag           = "<w:sdt>"
	sdtEndTag        = "</w:sdt>"
	documentXMLPath  = "word/document.xml"
	showingPlcHdr    = "<w:showingPlcHdr/>"
)

// DropdownData represents a dropdown configuration
type DropdownData struct {
    DropdownID    string
    SelectedValue string
    Type          string
}

// validateArgs validates the input arguments
func validateArgs(args []js.Value) error {
    if len(args) < 2 {
        return fmt.Errorf("2 parameters required: templateData (Uint8Array) and dropdowns (Array)")
    }
    
    dropdownsJS := args[1]
    if dropdownsJS.Type() != js.TypeObject || dropdownsJS.Get("length").Type() == js.TypeUndefined {
        return fmt.Errorf("The second parameter must be an array of dropdowns")
    }
    
    return nil
}

// parseDropdowns extracts dropdown data from JS array
func parseDropdowns(dropdownsJS js.Value) []DropdownData {
    dropdownsLength := dropdownsJS.Get("length").Int()
    var dropdowns []DropdownData
    
    for i := 0; i < dropdownsLength; i++ {
        dropdownObj := dropdownsJS.Index(i)
        dropdowns = append(dropdowns, DropdownData{
            DropdownID:    dropdownObj.Get("dropdownId").String(),
            SelectedValue: dropdownObj.Get("selectedValue").String(),
            Type:          dropdownObj.Get("type").String(),
        })
    }
    
    return dropdowns
}

func processDocxWasm(this js.Value, args []js.Value) interface{} {
    if err := validateArgs(args); err != nil {
        return createErrorResponse(err.Error())
    }

    templateDataJS := args[0]
    dropdownsJS := args[1]
    dropdowns := parseDropdowns(dropdownsJS)

    length := templateDataJS.Get("length").Int()

    if length == 0 {
        return createErrorResponse("Template is empty")
    }

    templateData := make([]byte, length)
    js.CopyBytesToGo(templateData, templateDataJS)

    defer func() {
        if r := recover(); r != nil {
            // Silently handle panics
        }
    }()

    reader := bytes.NewReader(templateData)
    zipReader, err := zip.NewReader(reader, int64(len(templateData)))
    if err != nil {
        return createErrorResponse(fmt.Sprintf("Error opening document: %v", err))
    }

    var documentXML *zip.File
    for _, file := range zipReader.File {
        if file.Name == documentXMLPath {
            documentXML = file
            break
        }
    }

    if documentXML == nil {
        return createErrorResponse("Invalid DOCX document: missing word/document.xml")
    }

    xmlReader, err := documentXML.Open()
    if err != nil {
        return createErrorResponse(fmt.Sprintf("Error reading document: %v", err))
    }
    defer xmlReader.Close()

    xmlContent, err := io.ReadAll(xmlReader)
    if err != nil {
        return createErrorResponse(fmt.Sprintf("Error reading content: %v", err))
    }

    xmlString := string(xmlContent)
    totalProcessed := 0
    var failedDropdowns []string

    for _, dropdown := range dropdowns {
        dropdownPattern := fmt.Sprintf(`<w:id w:val="%s"/>`, dropdown.DropdownID)
        if strings.Contains(xmlString, dropdownPattern) {
            dropdownStart := strings.Index(xmlString, dropdownPattern)
            if dropdownStart == -1 {
                failedDropdowns = append(failedDropdowns, dropdown.DropdownID)
                continue
            }

            sdtStart := strings.LastIndex(xmlString[:dropdownStart], sdtTag)
            if sdtStart == -1 {
                failedDropdowns = append(failedDropdowns, dropdown.DropdownID)
                continue
            }

            sdtEnd := strings.Index(xmlString[dropdownStart:], sdtEndTag)
            if sdtEnd == -1 {
                failedDropdowns = append(failedDropdowns, dropdown.DropdownID)
                continue
            }

            sdtEndPos := dropdownStart + sdtEnd + len(sdtEndTag)
            dropdownSection := xmlString[sdtStart:sdtEndPos]
            controlType := dropdown.Type

            var modifiedSection string
            switch controlType {
            case "dropdown":
                modifiedSection = updateDropdownSelection(dropdownSection, dropdown.SelectedValue)
            case "text":
                modifiedSection = updateTextSelection(dropdownSection, dropdown.SelectedValue)
            default:
                chooseItemPattern := `<w:t>Choose an item.</w:t>`
                processedValue := processLineBreaks(dropdown.SelectedValue)
                modifiedSection = strings.ReplaceAll(dropdownSection, chooseItemPattern, processedValue)
            }

            if modifiedSection != dropdownSection {
                xmlString = xmlString[:sdtStart] + modifiedSection + xmlString[sdtEndPos:]
                totalProcessed++
            } else {
                failedDropdowns = append(failedDropdowns, dropdown.DropdownID)
            }
        } else {
            failedDropdowns = append(failedDropdowns, dropdown.DropdownID)
        }
    }

    if totalProcessed == 0 {
        return createErrorResponse(fmt.Sprintf("Could not process any dropdown. Failed: %v", failedDropdowns))
    }

    var outputBuffer bytes.Buffer
    zipWriter := zip.NewWriter(&outputBuffer)

    for _, file := range zipReader.File {
        writer, err := zipWriter.Create(file.Name)
        if err != nil {
            return createErrorResponse(fmt.Sprintf("Error creating file: %v", err))
        }

        if file.Name == documentXMLPath {
            _, err = writer.Write([]byte(xmlString))
        } else {
            reader, err := file.Open()
            if err != nil {
                continue
            }
            _, err = io.Copy(writer, reader)
            reader.Close()
        }

        if err != nil {
            return createErrorResponse(fmt.Sprintf("Error writing file: %v", err))
        }
    }

    err = zipWriter.Close()
    if err != nil {
        return createErrorResponse(fmt.Sprintf("Error finalizing document: %v", err))
    }

    outputBytes := outputBuffer.Bytes()
    wasmBytes := js.Global().Get("Uint8Array").New(len(outputBytes))
    js.CopyBytesToJS(wasmBytes, outputBytes)

    return createSuccessResponse(
        fmt.Sprintf("Document processed successfully: %d/%d dropdowns modified", totalProcessed, len(dropdowns)),
        wasmBytes,
    )
}

// createErrorResponse creates a standard error response
func createErrorResponse(errorMsg string) map[string]interface{} {
	return map[string]interface{}{
		"success": false,
		"error":   errorMsg,
	}
}

// createSuccessResponse creates a standard success response
func createSuccessResponse(message string, fileData js.Value) map[string]interface{} {
	return map[string]interface{}{
		"success":  true,
		"message":  message,
		"fileData": fileData,
	}
}

func min(a, b int) int {
    if a < b {
        return a
    }
    return b
}

// escapeXML escapes special XML characters to prevent document corruption
func escapeXML(text string) string {
    text = strings.ReplaceAll(text, "&", "&amp;")
    text = strings.ReplaceAll(text, "<", "&lt;")
    text = strings.ReplaceAll(text, ">", "&gt;")
    text = strings.ReplaceAll(text, "\"", "&quot;")
    text = strings.ReplaceAll(text, "'", "&apos;")
    return text
}

// processLineBreaks converts line breaks in text to Word XML format
func processLineBreaks(text string) string {
    if text == "" {
        return ""
    }

    // Escape XML characters first
    escapedText := escapeXML(text)

    // Split text by line breaks (handle both \n and \r\n)
    lines := strings.Split(strings.ReplaceAll(escapedText, "\r\n", "\n"), "\n")

    if len(lines) <= 1 {
        // No line breaks, return simple text element
        return fmt.Sprintf(`<w:r w:rsidR="00730B13"><w:rPr><w:color w:val="0070C0"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US"/></w:rPr><w:t>%s</w:t></w:r>`, escapedText)
    }

    // Multiple lines, build XML with line breaks
    var result strings.Builder

    for i, line := range lines {
        // Add text element for each line
        result.WriteString(fmt.Sprintf(`<w:r w:rsidR="00730B13"><w:rPr><w:color w:val="0070C0"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US"/></w:rPr><w:t>%s</w:t></w:r>`, line))

        // Add line break between lines (except after the last line)
        if i < len(lines)-1 {
            result.WriteString(`<w:r w:rsidR="00730B13"><w:rPr><w:color w:val="0070C0"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US"/></w:rPr><w:br/></w:r>`)
        }
    }

    return result.String()
}



func updateDropdownSelection(sdtXML, selectedValue string) string {
	result := strings.ReplaceAll(sdtXML, showingPlcHdr, "")

	contentStart := strings.Index(result, sdtContentTag)
	contentEnd := strings.Index(result, sdtContentEndTag)

	if contentStart == -1 || contentEnd == -1 {
		return result
	}

	// Process line breaks in the selected value
	processedValue := processLineBreaks(selectedValue)
	newContent := fmt.Sprintf(`%s%s%s`, sdtContentTag, processedValue, sdtContentEndTag)

	beforeContent := result[:contentStart]
	afterContent := result[contentEnd+len(sdtContentEndTag):]

	return beforeContent + newContent + afterContent
}

func updateTextSelection(sdtXML, selectedValue string) string {
	result := strings.ReplaceAll(sdtXML, showingPlcHdr, "")

	contentStart := strings.Index(result, sdtContentTag)
	contentEnd := strings.Index(result, sdtContentEndTag)

	if contentStart == -1 || contentEnd == -1 {
		patterns := []string{
			`<w:t>Choose an item.</w:t>`,
			`<w:t>Enter Project code and title</w:t>`,
		}

		// Process line breaks in the selected value
		processedValue := processLineBreaks(selectedValue)
		newValuePattern := fmt.Sprintf(`%s`, processedValue)
		for _, pattern := range patterns {
			if strings.Contains(result, pattern) {
				return strings.ReplaceAll(result, pattern, newValuePattern)
			}
		}
		return result
	}

	// Process line breaks in the selected value
	processedValue := processLineBreaks(selectedValue)

	var newContent string
	if strings.Contains(result, "<w:tc>") {
		newContent = fmt.Sprintf(`<w:sdtContent><w:tc><w:tcPr><w:tcW w:w="4961" w:type="dxa"/><w:tcBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="nil"/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2" w:themeFill="background1" w:themeFillShade="F2"/></w:tcPr><w:p w14:paraId="77A59F33" w14:textId="0D341366" w:rsidR="00D93092" w:rsidRPr="002F02E5" w:rsidRDefault="00DF1D8E" w:rsidP="00491955"><w:pPr><w:pStyle w:val="Heading5"/><w:rPr><w:color w:val="0070C0"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US"/></w:rPr></w:pPr>%s</w:p></w:tc></w:sdtContent>`, processedValue)
	} else {
		newContent = fmt.Sprintf(`%s%s%s`, sdtContentTag, processedValue, sdtContentEndTag)
	}

	beforeContent := result[:contentStart]
	afterContent := result[contentEnd+len(sdtContentEndTag):]

	return beforeContent + newContent + afterContent
}



func main() {
    js.Global().Set("processDocxWasm", js.FuncOf(processDocxWasm))
    select {}
}
