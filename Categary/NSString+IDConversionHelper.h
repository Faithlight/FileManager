//
//  NSString.h
//  BicDroidEE
//
//  Created by 戴领 on 2017/9/4.
//  Copyright © 2017年 BicDroid. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CommonCrypto/CommonCryptor.h>
@interface NSString (IDConversionHelper)
- (NSString *)encryptUseDESWithKey:(NSString *)key;
- (NSString *)decryptUseDESWithKey:(NSString*)key;

- (NSString *)encryptUseAES128Withkey:(NSString *)key;
- (NSString *)decryptUseAES128Withkey:(NSString *)key;
@end
