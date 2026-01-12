package com.jh0103.authservice.dto;

import com.jh0103.authservice.domain.Role;
import com.jh0103.authservice.domain.User;
import lombok.Getter;
import lombok.Builder;

import java.util.Map;

@Getter
public class OAuthAttributes{
    private Map<String, Object> attributes;
    private String nameAttributeKey;
    private String name;
    private String email;
    private String picture;
    private String provider;
    private String providerId;

    @Builder
    public OAuthAttributes(Map<String, Object> attributes, String nameAttributeKey, String name, String email, String picture, String provider, String providerId){
        this.attributes = attributes;
        this.nameAttributeKey = nameAttributeKey;
        this.name = name;
        this.email = email;
        this.picture = picture;
        this.provider = provider;
        this.providerId = providerId;
    }

    public static OAuthAttributes of(String registrationId, String userNameAttributeName, Map<String, Object> attributes){
        if("naver".equals(registrationId)){
            return ofNaver(userNameAttributeName, attributes);
        }
        if("github".equals(registrationId)){
            return ofGithub(userNameAttributeName, attributes);
        }
        return ofGoogle(userNameAttributeName, attributes);
    }

    private static OAuthAttributes ofGoogle(String userNameAttributeName, Map<String, Object> attributes){
        return OAuthAttributes.builder()
                .name((String) attributes.get("name"))
                .email((String) attributes.get("email"))
                .picture((String) attributes.get("picture"))
                .attributes(attributes)
                .nameAttributeKey(userNameAttributeName)
                .provider("google")
                .providerId((String) attributes.get("sub"))
                .build();
    }
    private static OAuthAttributes ofGithub(String userNameAttributeName, Map<String, Object> attributes){
        return OAuthAttributes.builder()
                .name((String) attributes.get("login"))
                .email((String) attributes.get("email"))
                .picture((String) attributes.get("avatar_url"))
                .attributes(attributes)
                .nameAttributeKey(userNameAttributeName)
                .provider("github")
                .providerId(String.valueOf(attributes.get("id")))
                .build();
    }

    private static OAuthAttributes ofNaver(String userNameAttributeName, Map<String, Object> attributes){
        Map<String, Object> response = (Map<String, Object>) attributes.get("response");
        return OAuthAttributes.builder()
                .name((String) response.get("name"))
                .email((String) response.get("email"))
                .picture((String) response.get("profile_image"))
                .attributes(response)
                .nameAttributeKey("id")
                .provider("naver")
                .providerId((String) response.get("id"))
                .build();
    }

    public User toEntity(){
        return User.builder()
                .name(name)
                .email(email)
                .picture(picture)
                .provider(provider)
                .providerId(providerId)
                .role(Role.USER)
                .build();
    }
}