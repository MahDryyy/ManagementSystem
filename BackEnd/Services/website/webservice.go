package webservice

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/go-resty/resty/v2"
)

type WebService struct {
	client *resty.Client
}

func NewWebService() *WebService {
	return &WebService{
		client: resty.New(),
	}
}

func (c *WebService) GetReview() (map[string]interface{}, error) {
	adminKey := os.Getenv("X_ADMIN_KEY")
	if adminKey == "" {
		return nil, ErrMissingAdminKey
	}

	resp, err := c.client.R().
		SetHeader("X-Admin-Key", adminKey).
		Get("http://api-webadmin.kriampelgading.my.id/api/review")

	if err != nil {
		return nil, err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(resp.Body(), &result); err != nil {
		return nil, err
	}

	return result, nil
}

func (c *WebService) GetSosmedStat() (map[string]interface{}, error) {
	adminKey := os.Getenv("X_ADMIN_KEY")
	if adminKey == "" {
		return nil, ErrMissingAdminKey
	}

	resp, err := c.client.R().
		SetHeader("X-Admin-Key", adminKey).
		Get("http://api-webadmin.kriampelgading.my.id/api/admin/social-media-stats")

	if err != nil {
		return nil, err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(resp.Body(), &result); err != nil {
		return nil, err
	}

	return result, nil
}

func (c *WebService) GetSosmedEngagement() (map[string]interface{}, error) {
	adminKey := os.Getenv("X_ADMIN_KEY")
	if adminKey == "" {
		return nil, ErrMissingAdminKey
	}
	resp, err := c.client.R().
		SetHeader("X-Admin-Key", adminKey).
		Get("http://api-webadmin.kriampelgading.my.id/api/admin/social-media-engagement")
	if err != nil {
		return nil, err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(resp.Body(), &result); err != nil {
		return nil, err
	}
	return result, nil
}

func (c *WebService) GetWebVisitor() (map[string]interface{}, error) {
	adminKey := os.Getenv("X_ADMIN_KEY")
	if adminKey == "" {
		return nil, ErrMissingAdminKey
	}
	resp, err := c.client.R().
		SetHeader("X-Admin-Key", adminKey).
		Get("http://api-webadmin.kriampelgading.my.id/api/admin/stats/visitor")
	if err != nil {
		return nil, err
	}

	var result map[string]interface{}

	if err := json.Unmarshal(resp.Body(), &result); err != nil {
		return nil, err
	}

	return result, nil
}
func (c *WebService) GetWebSocialClick() (map[string]interface{}, error) {
	adminKey := os.Getenv("X_ADMIN_KEY")
	if adminKey == "" {
		return nil, ErrMissingAdminKey
	}
	resp, err := c.client.R().
		SetHeader("X-Admin-Key", adminKey).
		Get("http://api-webadmin.kriampelgading.my.id/api/admin/stats/social-clicks")
	if err != nil {
		return nil, err
	}

	var result map[string]interface{}

	if err := json.Unmarshal(resp.Body(), &result); err != nil {
		return nil, err
	}

	return result, nil
}

func (c *WebService) GetWebVisitorSesion() (map[string]interface{}, error) {
	adminKey := os.Getenv("X_ADMIN_KEY")
	if adminKey == "" {
		return nil, ErrMissingAdminKey
	}
	resp, err := c.client.R().
		SetHeader("X-Admin-Key", adminKey).
		Get("http://api-webadmin.kriampelgading.my.id/api/admin/visitor-sessions")
	if err != nil {
		return nil, err
	}

	var result map[string]interface{}

	if err := json.Unmarshal(resp.Body(), &result); err != nil {
		return nil, err
	}

	return result, nil
}

func (c *WebService) GetTiktokStat() (map[string]interface{}, error) {
	adminKey := os.Getenv("X_ADMIN_KEY")
	if adminKey == "" {
		return nil, ErrMissingAdminKey
	}
	resp, err := c.client.R().
		SetHeader("X-Admin-Key", adminKey).
		Get("http://api-webadmin.kriampelgading.my.id/api/tiktok-stats")
	if err != nil {
		return nil, err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(resp.Body(), &result); err != nil {
		return nil, err
	}
	return result, nil
}

func (c *WebService) GetTiktokHitStat() (map[string]interface{}, error) {
	adminKey := os.Getenv("X_ADMIN_KEY")
	if adminKey == "" {
		return nil, ErrMissingAdminKey
	}
	resp, err := c.client.R().
		SetHeader("X-Admin-Key", adminKey).
		Get("http://api-webadmin.kriampelgading.my.id/api/admin/tiktok/hit-stats")
	if err != nil {
		return nil, err
	}
	var result map[string]interface{}
	if err := json.Unmarshal(resp.Body(), &result); err != nil {
		return nil, err
	}
	return result, nil
}

var ErrMissingAdminKey = fmt.Errorf("missing X-Admin-Key in environment")
