/**
 * Created by Felix Markman on 01/12/2017.
 */
export function onAfterCalculate(quote, lines, conn) {
	if(quote.record["SBQQ__Type__c"] === "Amendment" && quote.record["SBQQ__MasterContract__c"]){	
		if (lines.length > 0) {
			var productCodes = [];
			lines.forEach(function(line) {
				if (line.record['SBQQ__ProductCode__c']) {
					productCodes.push(line.record['SBQQ__ProductCode__c']);
				}
			});

				// var codeList = "('" + productCodes.join("', '") + "')";
				var queryStatement = "('" + quote.record["Original_Quote_ID__c"] + "')"
				/*
				 * conn.query() returns a Promise that resolves when the query completes.
				 */
				return conn.query('SELECT SBQQ__ProductCode__c, SBQQ__Quantity__c, MDQ_Identifier__c, Uplift_Percent__c, Commitment_Discount__c, Volume_Discount__c, Conversion_Discount__c, Other_Discount__c, SBQQ__ListPrice__c, SBQQ__NetPrice__c, SBQQ__Quote__c FROM SBQQ__QuoteLine__c WHERE SBQQ__Quote__c IN '  + queryStatement)
					.then(function(results) {
						/*
						 * conn.query()'s Promise resolves to an object with three attributes:
						 * - totalSize: an integer indicating how many records were returned
						 * - done: a boolean indicating whether the query has completed
						 * - records: a list of all records returned
						 */
						 console.log("inside results function");
						 console.log(results); 
						if (results.totalSize) {
							var finalUnitPriceLocal = 0; 
							var volumeDiscountValues = {}; 
							var commitmentDiscountValues = {}; 
							var conversionDiscountValues = {}; 
							var otherDiscountValues = {}; 
							var upliftValues = {}; 
							var originalQuantities = {}; 
							var str = '';
							var str2 = '';
							var str3 = '';
							
							results.records.forEach(function(record) {
								volumeDiscountValues[record.MDQ_Identifier__c]     = record.Volume_Discount__c;
								otherDiscountValues[record.MDQ_Identifier__c]      = record.Other_Discount__c; 
								upliftValues[record.MDQ_Identifier__c]             = record.Uplift_Percent__c; 
								originalQuantities[record.MDQ_Identifier__c]       = record.SBQQ__Quantity__c; 
								console.log("inside new plugin 16"); 
							});
							lines.forEach(function(line) {
								if (line.record['SBQQ__ProductCode__c']) {
									// Iterating over mdq lines to transfer discount information onto Quote fields 
									if(line.record["SBQQ__SegmentIndex__c"] == 1 && line.record["SBQQ__ProductName__c"] == "Unity Pro"){
											str += line.record["SBQQ__ProductName__c"] + " Year " + line.record["SBQQ__SegmentIndex__c"];
											str += " Discounts: " + line.record["Discount_Uplift__c"]; 		
									}
									if(line.record["SBQQ__SegmentIndex__c"] == 2 && line.record["SBQQ__ProductName__c"] == "Unity Pro"){
											str2 += line.record["SBQQ__ProductName__c"] + " Year " + line.record["SBQQ__SegmentIndex__c"];
											str2 += " Discounts: " + line.record["Discount_Uplift__c"]; 		
									}
									if(line.record["SBQQ__SegmentIndex__c"] == 3 && line.record["SBQQ__ProductName__c"] == "Unity Pro"){
											str3 += line.record["SBQQ__ProductName__c"] + " Year " + line.record["SBQQ__SegmentIndex__c"];
											str3 += " Discounts: " + line.record["Discount_Uplift__c"]; 		
									}

									line.record["Seats_Reduced__c"] = "FALSE"; 

									line.record["Original_Volume_Discount__c"] = volumeDiscountValues[line.record['MDQ_Identifier__c']];
									line.record["Original_Other_Discount__c"]  = otherDiscountValues[line.record['MDQ_Identifier__c']];
									line.record["Original_Uplift__c"] 		   = upliftValues[line.record['MDQ_Identifier__c']];
									line.record["Original_Line_Quantity__c"]   = originalQuantities[line.record['MDQ_Identifier__c']];; 
									line.record["Original_Conversion_Discount__c"] = 0; 

									if(line.record["SBQQ__Quantity__c"] < line.record["Original_Line_Quantity__c"]){
										line.record["Seats_Reduced__c"] = "TRUE"; 
									}
									// execute the transfer of discount information from original lines onto amendment lines only the first time to allow users to overwrite it 
									if(quote.record["QCP_Ran__c"] != true){ 
										line.record['Volume_Discount__c'] 	  = volumeDiscountValues[line.record['MDQ_Identifier__c']];
										line.record['Other_Discount__c']	  = otherDiscountValues[line.record['MDQ_Identifier__c']];
										line.record['Uplift_Percent__c']	  = upliftValues[line.record['MDQ_Identifier__c']];
									}
									// repeat Final Unit Price Calculation to prevent need to calculate twice. Using formula here leads to lagging calculation. User would have to calculate twice to get up-to-date 
									line.record["Final_Unit_Price_Number__c"] = (line.record["SBQQ__ListPrice__c"] + (line.record["SBQQ__ListPrice__c"]*line.record["Uplift_Percent__c"])) * (1-(line.record["Other_Discount__c"])/100) * (1-(line.record["Volume_Discount__c"])/100) * (1-(line.record["Conversion_Discount__c"])/100) * (1-(line.record["Commitment_Discount__c"])/100) * line.record["Prorate_Multiplier_Copy__c"]; 
									console.log("Final Unit Price Number: " + line.record["Final_Unit_Price_Number__c"]);
								}
							});
							
							quote.record["Quote_Line_Details__c"] = str; 
							quote.record["Quote_Line_Details_2__c"] = str2; 
							quote.record["Quote_Line_Details_3__c"] = str3; 
							quote.record["QCP_Ran__c"] = true; 
							console.log("QCP Ran: " + quote.record["QCP_Ran__c"]);
							quote.record["Amendment_Discounts_Increased__c"] = false;  
							lines.forEach(function(line) {
								if(line.record['Other_Discount__c'] > line.record["Original_Other_Discount__c"]){
									quote.record["Amendment_Discounts_Increased__c"] = true;  
								}
								if(line.record['Volume_Discount__c'] > line.record["Original_Volume_Discount__c"]){
									quote.record["Amendment_Discounts_Increased__c"] = true;  								
								}
								if(line.record['Uplift_Percent__c'] > line.record["Original_Uplift__c"]){
									quote.record["Amendment_Discounts_Increased__c"] = true;  								
								}
							});
						}
					});
				}
		} else { 
			// portion that runs on non-Amendment Quotes to transfer line information onto Quote 
			var str = '';
			var str2 = '';
			var str3 = '';
			console.log("inside post-amendment code"); 	
			lines.forEach(function(line) {

				if(line.record["SBQQ__SegmentIndex__c"] == 1 && line.record["SBQQ__ProductName__c"] == "Unity Pro"){
					str += line.record["SBQQ__ProductName__c"] + " Year " + line.record["SBQQ__SegmentIndex__c"];
					str += " Discounts: " + line.record["Discount_Uplift__c"]; 		
				}
				if(line.record["SBQQ__SegmentIndex__c"] == 2 && line.record["SBQQ__ProductName__c"] == "Unity Pro"){
					str2 += line.record["SBQQ__ProductName__c"] + " Year " + line.record["SBQQ__SegmentIndex__c"];
					str2 += " Discounts: " + line.record["Discount_Uplift__c"]; 		
				}
				if(line.record["SBQQ__SegmentIndex__c"] == 3 && line.record["SBQQ__ProductName__c"] == "Unity Pro"){
					str3 += line.record["SBQQ__ProductName__c"] + " Year " + line.record["SBQQ__SegmentIndex__c"];
					str3 += " Discounts: " + line.record["Discount_Uplift__c"]; 		
				}
			});
			quote.record["Quote_Line_Details__c"] = str; 
			quote.record["Quote_Line_Details_2__c"] = str2; 
			quote.record["Quote_Line_Details_3__c"] = str3; 
		}
}
